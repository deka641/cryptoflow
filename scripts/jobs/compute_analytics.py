#!/usr/bin/env python3
"""
Batch Job: Compute Analytics
Schedule: Daily at 04:00 via cron

Computes Pearson correlation matrix (top 15 coins) and volatility
metrics (all coins) from daily close prices. Upserts into
analytics_correlation and analytics_volatility.
"""
import sys
import os
import math
import logging
from datetime import datetime, timezone, timedelta

import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DB_DSN = os.getenv("DATABASE_URL", "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow")
JOB_ID = "compute_analytics"


def pearson(x: list[float], y: list[float]) -> float | None:
    """Compute Pearson correlation between two lists."""
    n = len(x)
    if n < 5:
        return None
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    cov = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    std_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x))
    std_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y))
    if std_x == 0 or std_y == 0:
        return None
    return cov / (std_x * std_y)


def daily_returns(prices: list[float]) -> list[float]:
    """Compute daily returns from a list of prices."""
    returns = []
    for i in range(1, len(prices)):
        if prices[i - 1] > 0:
            returns.append((prices[i] - prices[i - 1]) / prices[i - 1])
    return returns


def run():
    start_time = datetime.now(timezone.utc)
    records_processed = 0
    error_message = None

    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()

        for period_days in [30, 90]:
            cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)
            logger.info(f"Computing analytics for {period_days}d period...")

            # Get top 15 coins by market cap rank
            cur.execute("""
                SELECT id, symbol FROM dim_coin
                WHERE market_cap_rank IS NOT NULL
                ORDER BY market_cap_rank
                LIMIT 15
            """)
            top_coins = cur.fetchall()
            coin_ids = [c[0] for c in top_coins]

            # Fetch daily close prices for all coins
            coin_prices: dict[int, list[tuple[str, float]]] = {}
            for coin_id in coin_ids:
                cur.execute("""
                    SELECT timestamp::date, price_usd
                    FROM fact_market_data
                    WHERE coin_id = %s
                      AND timestamp >= %s
                      AND price_usd IS NOT NULL
                    ORDER BY timestamp
                """, (coin_id, cutoff))
                # Take last price per day
                day_prices: dict[str, float] = {}
                for row in cur.fetchall():
                    day_prices[str(row[0])] = float(row[1])
                coin_prices[coin_id] = sorted(day_prices.items())

            # Compute correlation matrix
            corr_rows = []
            for i, coin_a in enumerate(coin_ids):
                for j, coin_b in enumerate(coin_ids):
                    if i > j:
                        continue  # skip duplicates, will insert both directions

                    prices_a = dict(coin_prices.get(coin_a, []))
                    prices_b = dict(coin_prices.get(coin_b, []))
                    common_dates = sorted(set(prices_a.keys()) & set(prices_b.keys()))

                    if len(common_dates) < 5:
                        corr = None
                    elif coin_a == coin_b:
                        corr = 1.0
                    else:
                        returns_a = daily_returns([prices_a[d] for d in common_dates])
                        returns_b = daily_returns([prices_b[d] for d in common_dates])
                        min_len = min(len(returns_a), len(returns_b))
                        corr = pearson(returns_a[:min_len], returns_b[:min_len])

                    corr_val = round(corr, 6) if corr is not None else None
                    corr_rows.append((coin_a, coin_b, period_days, corr_val, datetime.now(timezone.utc)))
                    if coin_a != coin_b:
                        corr_rows.append((coin_b, coin_a, period_days, corr_val, datetime.now(timezone.utc)))

            if corr_rows:
                execute_values(cur, """
                    INSERT INTO analytics_correlation (coin_a_id, coin_b_id, period_days, correlation, computed_at)
                    VALUES %s
                    ON CONFLICT (coin_a_id, coin_b_id, period_days) DO UPDATE SET
                        correlation = EXCLUDED.correlation,
                        computed_at = EXCLUDED.computed_at
                """, corr_rows)
                records_processed += len(corr_rows)

            # Compute volatility for ALL coins
            cur.execute("SELECT id, symbol FROM dim_coin WHERE market_cap_rank IS NOT NULL ORDER BY market_cap_rank")
            all_coins = cur.fetchall()

            vol_rows = []
            for coin_id, symbol in all_coins:
                cur.execute("""
                    SELECT timestamp::date, price_usd
                    FROM fact_market_data
                    WHERE coin_id = %s AND timestamp >= %s AND price_usd IS NOT NULL
                    ORDER BY timestamp
                """, (coin_id, cutoff))
                day_prices_map: dict[str, float] = {}
                for row in cur.fetchall():
                    day_prices_map[str(row[0])] = float(row[1])
                prices = [day_prices_map[d] for d in sorted(day_prices_map.keys())]

                if len(prices) < 5:
                    continue

                returns = daily_returns(prices)
                if not returns:
                    continue

                # Volatility = std dev of daily returns
                mean_ret = sum(returns) / len(returns)
                variance = sum((r - mean_ret) ** 2 for r in returns) / len(returns)
                vol = math.sqrt(variance)

                # Max drawdown
                peak = prices[0]
                max_dd = 0.0
                for p in prices:
                    if p > peak:
                        peak = p
                    dd = (peak - p) / peak if peak > 0 else 0
                    if dd > max_dd:
                        max_dd = dd

                # Sharpe ratio (annualized, risk-free = 0)
                annualized_return = mean_ret * 365
                annualized_vol = vol * math.sqrt(365)
                sharpe = annualized_return / annualized_vol if annualized_vol > 0 else 0.0

                vol_rows.append((
                    coin_id, period_days,
                    round(vol, 6),
                    round(max_dd, 4),
                    round(max(min(sharpe, 99.0), -99.0), 4),
                    datetime.now(timezone.utc),
                ))

            if vol_rows:
                execute_values(cur, """
                    INSERT INTO analytics_volatility (coin_id, period_days, volatility, max_drawdown, sharpe_ratio, computed_at)
                    VALUES %s
                    ON CONFLICT (coin_id, period_days) DO UPDATE SET
                        volatility = EXCLUDED.volatility,
                        max_drawdown = EXCLUDED.max_drawdown,
                        sharpe_ratio = EXCLUDED.sharpe_ratio,
                        computed_at = EXCLUDED.computed_at
                """, vol_rows)
                records_processed += len(vol_rows)

            conn.commit()
            logger.info(f"  {period_days}d: {len(corr_rows)} correlation + {len(vol_rows)} volatility rows")

        cur.close()
        conn.close()

    except Exception as e:
        error_message = str(e)[:500]
        logger.error(f"Job failed: {e}")

    # Log pipeline run
    end_time = datetime.now(timezone.utc)
    status = "success" if error_message is None else "failed"

    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO pipeline_runs (dag_id, status, start_time, end_time, records_processed, error_message)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (JOB_ID, status, start_time, end_time, records_processed, error_message))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log pipeline run: {e}")

    logger.info(f"Job finished: {status} ({records_processed} records in {(end_time - start_time).total_seconds():.1f}s)")
    return 0 if status == "success" else 1


if __name__ == "__main__":
    sys.exit(run())
