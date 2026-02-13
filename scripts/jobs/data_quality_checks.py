#!/usr/bin/env python3
"""
Batch Job: Data Quality Checks
Schedule: Hourly via cron

Runs automated quality checks on the data warehouse:
  - Freshness: Is the latest data less than 30 minutes old?
  - Completeness: Are all tracked coins present in the latest snapshot?
  - Schema: Are there NULL prices where they shouldn't be?
  - Anomaly: Any price change > 50% in 10 minutes?
  - Referential integrity: Do all fact rows reference valid dimensions?

Results are inserted into data_quality_checks.
"""
import sys
import os
import json
import logging
from datetime import datetime, timezone

import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DB_DSN = os.getenv("DATABASE_URL", "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow")
JOB_ID = "data_quality_checks"


def to_float(val):
    """Convert Decimal/numeric to float for JSON serialization."""
    if val is None:
        return None
    return float(val)


def run_check(cur, check_name: str, table_name: str, query: str, evaluate) -> dict:
    """Run a single check and return result dict."""
    cur.execute(query)
    raw = cur.fetchone()
    # Convert all Decimal values to float
    result = tuple(to_float(v) if v is not None else v for v in raw) if raw else raw
    status, details = evaluate(result)
    return {
        "check_name": check_name,
        "table_name": table_name,
        "status": status,
        "details": details,
    }


def run():
    start_time = datetime.now(timezone.utc)
    records_processed = 0
    error_message = None

    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        checks = []

        # 1. Freshness check: latest market data within 30 min
        def eval_freshness(row):
            if row is None or row[0] is None:
                return "failed", {"message": "No market data found"}
            minutes_ago = row[0]
            if minutes_ago <= 30:
                return "passed", {"minutes_since_last_data": round(minutes_ago, 1)}
            elif minutes_ago <= 60:
                return "warning", {"minutes_since_last_data": round(minutes_ago, 1)}
            else:
                return "failed", {"minutes_since_last_data": round(minutes_ago, 1)}

        checks.append(run_check(cur, "data_freshness", "fact_market_data",
            "SELECT EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) / 60.0 FROM fact_market_data",
            eval_freshness))

        # 2. Completeness: all coins have data in last hour
        def eval_completeness(row):
            total_coins = row[0] or 0
            coins_with_data = row[1] or 0
            pct = (coins_with_data / total_coins * 100) if total_coins > 0 else 0
            if pct >= 90:
                return "passed", {"total_coins": total_coins, "coins_with_recent_data": coins_with_data, "coverage_pct": round(pct, 1)}
            elif pct >= 70:
                return "warning", {"total_coins": total_coins, "coins_with_recent_data": coins_with_data, "coverage_pct": round(pct, 1)}
            else:
                return "failed", {"total_coins": total_coins, "coins_with_recent_data": coins_with_data, "coverage_pct": round(pct, 1)}

        checks.append(run_check(cur, "data_completeness", "fact_market_data",
            """SELECT
                (SELECT COUNT(*) FROM dim_coin WHERE market_cap_rank IS NOT NULL),
                (SELECT COUNT(DISTINCT coin_id) FROM fact_market_data WHERE timestamp > NOW() - INTERVAL '1 hour')
            """,
            eval_completeness))

        # 3. Schema: no NULL prices in recent data
        def eval_null_prices(row):
            null_count = row[0] or 0
            total = row[1] or 0
            if null_count == 0:
                return "passed", {"null_prices": 0, "total_recent_rows": total}
            elif null_count <= 5:
                return "warning", {"null_prices": null_count, "total_recent_rows": total}
            else:
                return "failed", {"null_prices": null_count, "total_recent_rows": total}

        checks.append(run_check(cur, "null_price_check", "fact_market_data",
            """SELECT
                COUNT(*) FILTER (WHERE price_usd IS NULL),
                COUNT(*)
            FROM fact_market_data
            WHERE timestamp > NOW() - INTERVAL '1 hour'
            """,
            eval_null_prices))

        # 4. Anomaly: price changes > 50% between consecutive snapshots
        def eval_anomaly(row):
            anomaly_count = row[0] or 0
            if anomaly_count == 0:
                return "passed", {"anomalies_detected": 0}
            elif anomaly_count <= 3:
                return "warning", {"anomalies_detected": anomaly_count}
            else:
                return "failed", {"anomalies_detected": anomaly_count}

        checks.append(run_check(cur, "price_anomaly_detection", "fact_market_data",
            """WITH price_changes AS (
                SELECT
                    coin_id,
                    price_usd,
                    LAG(price_usd) OVER (PARTITION BY coin_id ORDER BY timestamp) AS prev_price,
                    timestamp
                FROM fact_market_data
                WHERE timestamp > NOW() - INTERVAL '24 hours'
                  AND price_usd IS NOT NULL
            )
            SELECT COUNT(*)
            FROM price_changes
            WHERE prev_price IS NOT NULL
              AND prev_price > 0
              AND ABS(price_usd - prev_price) / prev_price > 0.5
            """,
            eval_anomaly))

        # 5. Referential integrity: fact rows reference valid dim_coin
        def eval_ref_integrity(row):
            orphan_count = row[0] or 0
            if orphan_count == 0:
                return "passed", {"orphan_records": 0}
            else:
                return "failed", {"orphan_records": orphan_count}

        checks.append(run_check(cur, "referential_integrity", "fact_market_data",
            """SELECT COUNT(*)
            FROM fact_market_data fm
            LEFT JOIN dim_coin dc ON dc.id = fm.coin_id
            WHERE dc.id IS NULL
              AND fm.timestamp > NOW() - INTERVAL '24 hours'
            """,
            eval_ref_integrity))

        # 6. OHLCV consistency: close prices within reasonable range
        def eval_ohlcv(row):
            bad_rows = row[0] or 0
            if bad_rows == 0:
                return "passed", {"inconsistent_rows": 0}
            elif bad_rows <= 5:
                return "warning", {"inconsistent_rows": bad_rows}
            else:
                return "failed", {"inconsistent_rows": bad_rows}

        checks.append(run_check(cur, "ohlcv_consistency", "fact_daily_ohlcv",
            """SELECT COUNT(*)
            FROM fact_daily_ohlcv
            WHERE date > CURRENT_DATE - 7
              AND (high_price < low_price OR close_price > high_price * 1.01 OR close_price < low_price * 0.99)
            """,
            eval_ohlcv))

        # Insert all check results
        for check in checks:
            cur.execute("""
                INSERT INTO data_quality_checks (check_name, table_name, status, details, executed_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, (check["check_name"], check["table_name"], check["status"],
                  json.dumps(check["details"]) if check["details"] else None))
            records_processed += 1
            logger.info(f"  {check['status'].upper():7s} | {check['check_name']}: {check['details']}")

        conn.commit()
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

    logger.info(f"Job finished: {status} ({records_processed} checks in {(end_time - start_time).total_seconds():.1f}s)")
    return 0 if status == "success" else 1


if __name__ == "__main__":
    sys.exit(run())
