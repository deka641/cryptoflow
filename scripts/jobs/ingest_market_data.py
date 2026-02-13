#!/usr/bin/env python3
"""
Batch Job: Ingest Market Data
Schedule: Every 10 minutes via cron

Fetches top 50 coins from CoinGecko, upserts dim_coin,
inserts into fact_market_data, and refreshes the materialized view.
"""
import sys
import os
import time
import logging
from datetime import datetime, timezone

import httpx
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DB_DSN = os.getenv("DATABASE_URL", "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow")
COINGECKO_URL = "https://api.coingecko.com/api/v3"
JOB_ID = "ingest_market_data"


def fetch_coins_markets(per_page: int = 50) -> list[dict]:
    """Fetch top coins from CoinGecko /coins/markets with retry."""
    url = f"{COINGECKO_URL}/coins/markets"
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": per_page,
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    }
    for attempt in range(3):
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 429:
                    wait = 2 ** (attempt + 1) * 10
                    logger.warning(f"Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            logger.warning(f"Attempt {attempt+1} failed: {e}")
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    return []


def run():
    start_time = datetime.now(timezone.utc)
    records_processed = 0
    error_message = None

    try:
        logger.info("Fetching top 50 coins from CoinGecko...")
        coins = fetch_coins_markets(50)
        logger.info(f"Received {len(coins)} coins")

        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()

        # Upsert dim_coin
        for c in coins:
            cur.execute("""
                INSERT INTO dim_coin (coingecko_id, symbol, name, image_url, market_cap_rank, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (coingecko_id) DO UPDATE SET
                    symbol = EXCLUDED.symbol,
                    name = EXCLUDED.name,
                    image_url = EXCLUDED.image_url,
                    market_cap_rank = EXCLUDED.market_cap_rank,
                    updated_at = NOW()
                RETURNING id
            """, (c["id"], c["symbol"], c["name"], c.get("image"), c.get("market_cap_rank")))
        conn.commit()
        logger.info("dim_coin upserted")

        # Build coin_id lookup
        cur.execute("SELECT coingecko_id, id FROM dim_coin")
        coin_map = dict(cur.fetchall())

        # Insert fact_market_data
        now = datetime.now(timezone.utc).replace(microsecond=0)
        rows = []
        for c in coins:
            coin_id = coin_map.get(c["id"])
            if not coin_id:
                continue
            rows.append((
                coin_id,
                now,
                c.get("current_price"),
                c.get("market_cap"),
                c.get("total_volume"),
                c.get("price_change_percentage_24h"),
                c.get("circulating_supply"),
            ))

        if rows:
            execute_values(cur, """
                INSERT INTO fact_market_data
                    (coin_id, timestamp, price_usd, market_cap, total_volume, price_change_24h_pct, circulating_supply)
                VALUES %s
                ON CONFLICT (coin_id, timestamp) DO NOTHING
            """, rows)
            records_processed = len(rows)
            conn.commit()
            logger.info(f"Inserted {records_processed} market data rows")

        # Refresh materialized view
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_market_data")
        conn.commit()
        logger.info("Materialized view refreshed")

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
