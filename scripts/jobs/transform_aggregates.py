#!/usr/bin/env python3
"""
Batch Job: Transform Aggregates (OHLCV)
Schedule: Daily at 03:00 via cron

Computes daily OHLCV (Open/High/Low/Close/Volume) from fact_market_data
and inserts into fact_daily_ohlcv. Idempotent — uses ON CONFLICT.
"""
import sys
import os
import logging
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from _common import db_connection, log_pipeline_run

# Load .env from project root
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DB_DSN = os.environ["DATABASE_URL"]
JOB_ID = "transform_aggregates"


def run():
    start_time = datetime.now(timezone.utc)
    records_processed = 0
    error_message = None

    try:
        with db_connection(DB_DSN) as conn:
            cur = conn.cursor()

            # Compute OHLCV for all dates that have market data but no OHLCV yet,
            # plus re-compute yesterday to catch late-arriving data
            logger.info("Computing daily OHLCV aggregates...")
            cur.execute("""
                INSERT INTO fact_daily_ohlcv (coin_id, date, open_price, high_price, low_price, close_price, volume)
                SELECT
                    fm.coin_id,
                    fm.timestamp::date AS date,
                    (ARRAY_AGG(fm.price_usd ORDER BY fm.timestamp ASC))[1] AS open_price,
                    MAX(fm.price_usd) AS high_price,
                    MIN(fm.price_usd) AS low_price,
                    (ARRAY_AGG(fm.price_usd ORDER BY fm.timestamp DESC))[1] AS close_price,
                    MAX(fm.total_volume) AS volume
                FROM fact_market_data fm
                WHERE fm.price_usd IS NOT NULL
                  AND fm.timestamp::date <= CURRENT_DATE - 1
                  AND fm.timestamp::date >= CURRENT_DATE - 90
                GROUP BY fm.coin_id, fm.timestamp::date
                HAVING COUNT(*) >= 1
                ON CONFLICT (coin_id, date) DO UPDATE SET
                    open_price = EXCLUDED.open_price,
                    high_price = EXCLUDED.high_price,
                    low_price = EXCLUDED.low_price,
                    close_price = EXCLUDED.close_price,
                    volume = EXCLUDED.volume
                RETURNING id
            """)
            records_processed = cur.rowcount
            conn.commit()
            logger.info(f"Upserted {records_processed} OHLCV rows")

            # Ensure dim_time has entries for these dates
            cur.execute("""
                INSERT INTO dim_time (date, year, quarter, month, week, day_of_week, day_of_month, is_weekend)
                SELECT
                    d::date,
                    EXTRACT(YEAR FROM d)::smallint,
                    EXTRACT(QUARTER FROM d)::smallint,
                    EXTRACT(MONTH FROM d)::smallint,
                    EXTRACT(WEEK FROM d)::smallint,
                    EXTRACT(DOW FROM d)::smallint,
                    EXTRACT(DAY FROM d)::smallint,
                    EXTRACT(DOW FROM d) IN (0, 6)
                FROM generate_series(
                    CURRENT_DATE - INTERVAL '90 days',
                    CURRENT_DATE,
                    '1 day'::interval
                ) d
                ON CONFLICT (date) DO NOTHING
            """)
            conn.commit()

            cur.close()

    except Exception as e:
        error_message = str(e)[:500]
        logger.error(f"Job failed: {e}")

    status = log_pipeline_run(JOB_ID, start_time, records_processed, error_message, DB_DSN)
    return 0 if status == "success" else 1


if __name__ == "__main__":
    sys.exit(run())
