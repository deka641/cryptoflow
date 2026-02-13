"""
DAG: transform_aggregates
==========================
Runs daily at 03:00 UTC.  Computes daily OHLCV aggregates from
``fact_market_data`` for the last 7 days and upserts them into
``fact_daily_ohlcv``.

For each (coin_id, date) combination:
- **open**   = first price of the day  (earliest timestamp)
- **close**  = last price of the day   (latest timestamp)
- **high**   = max price
- **low**    = min price
- **volume** = average total_volume across the day's snapshots

Uses a single SQL query with window functions to compute all values
efficiently, then performs an ON CONFLICT UPDATE upsert.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import psycopg2
import psycopg2.extras

from airflow import DAG
from airflow.operators.python import PythonOperator

DB_DSN = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"
LOOKBACK_DAYS = 7

logger = logging.getLogger(__name__)


def _get_conn():
    return psycopg2.connect(DB_DSN)


# ---------------------------------------------------------------------------
# Task callables
# ---------------------------------------------------------------------------

def compute_daily_ohlcv(**context):
    """
    Aggregate intraday snapshots into daily OHLCV rows for the last 7 days,
    then upsert into fact_daily_ohlcv.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    # This query computes OHLCV in pure SQL using window functions.
    # DISTINCT ON + ordering gives us the first/last prices per day.
    agg_sql = """
        WITH daily AS (
            SELECT
                coin_id,
                (timestamp AT TIME ZONE 'UTC')::date AS dt,
                price_usd,
                total_volume,
                ROW_NUMBER() OVER (
                    PARTITION BY coin_id, (timestamp AT TIME ZONE 'UTC')::date
                    ORDER BY timestamp ASC
                ) AS rn_asc,
                ROW_NUMBER() OVER (
                    PARTITION BY coin_id, (timestamp AT TIME ZONE 'UTC')::date
                    ORDER BY timestamp DESC
                ) AS rn_desc
            FROM fact_market_data
            WHERE timestamp >= %s
              AND price_usd IS NOT NULL
        )
        SELECT
            d.coin_id,
            d.dt,
            MAX(CASE WHEN d.rn_asc  = 1 THEN d.price_usd END) AS open_price,
            MAX(agg.high_price)                                  AS high_price,
            MAX(agg.low_price)                                   AS low_price,
            MAX(CASE WHEN d.rn_desc = 1 THEN d.price_usd END) AS close_price,
            MAX(agg.avg_volume)                                  AS volume
        FROM daily d
        JOIN (
            SELECT
                coin_id,
                (timestamp AT TIME ZONE 'UTC')::date AS dt,
                MAX(price_usd)       AS high_price,
                MIN(price_usd)       AS low_price,
                AVG(total_volume)    AS avg_volume
            FROM fact_market_data
            WHERE timestamp >= %s
              AND price_usd IS NOT NULL
            GROUP BY coin_id, (timestamp AT TIME ZONE 'UTC')::date
        ) agg ON agg.coin_id = d.coin_id AND agg.dt = d.dt
        GROUP BY d.coin_id, d.dt
    """

    upsert_sql = """
        INSERT INTO fact_daily_ohlcv
            (coin_id, date, open_price, high_price, low_price, close_price, volume)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (coin_id, date) DO UPDATE SET
            open_price  = EXCLUDED.open_price,
            high_price  = EXCLUDED.high_price,
            low_price   = EXCLUDED.low_price,
            close_price = EXCLUDED.close_price,
            volume      = EXCLUDED.volume
    """

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(agg_sql, (cutoff, cutoff))
            rows = cur.fetchall()
            logger.info("Computed %d daily OHLCV rows", len(rows))

            if rows:
                psycopg2.extras.execute_batch(cur, upsert_sql, rows, page_size=200)
                logger.info("Upserted %d rows into fact_daily_ohlcv", len(rows))

        conn.commit()
    finally:
        conn.close()

    context["ti"].xcom_push(key="rows_upserted", value=len(rows))
    return len(rows)


def populate_dim_time(**context):
    """
    Ensure dim_time has rows for every date that appears in the freshly
    computed OHLCV data (last 7 days).  Uses ON CONFLICT DO NOTHING.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    sql = """
        INSERT INTO dim_time (date, year, quarter, month, week, day_of_week, day_of_month, is_weekend)
        SELECT
            d::date,
            EXTRACT(YEAR FROM d)::int,
            EXTRACT(QUARTER FROM d)::int,
            EXTRACT(MONTH FROM d)::int,
            EXTRACT(WEEK FROM d)::int,
            EXTRACT(ISODOW FROM d)::int,
            EXTRACT(DAY FROM d)::int,
            EXTRACT(ISODOW FROM d)::int IN (6, 7)
        FROM generate_series(%s::date, CURRENT_DATE, '1 day'::interval) AS d
        ON CONFLICT (date) DO NOTHING
    """

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (cutoff.date(),))
            logger.info("dim_time populated for last %d days", LOOKBACK_DAYS)
        conn.commit()
    finally:
        conn.close()


def log_pipeline_run(**context):
    """Record the pipeline run."""
    ti = context["ti"]
    rows = ti.xcom_pull(task_ids="compute_daily_ohlcv", key="rows_upserted") or 0
    dag_run = context["dag_run"]

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pipeline_runs
                    (dag_id, status, start_time, end_time, records_processed, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (
                    "transform_aggregates",
                    "success",
                    dag_run.start_date,
                    datetime.now(timezone.utc),
                    rows,
                ),
            )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------

default_args = {
    "owner": "cryptoflow",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="transform_aggregates",
    default_args=default_args,
    description="Compute daily OHLCV aggregates from intraday market snapshots",
    schedule_interval="0 3 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["cryptoflow", "transform"],
) as dag:

    t_ohlcv = PythonOperator(
        task_id="compute_daily_ohlcv",
        python_callable=compute_daily_ohlcv,
    )

    t_dim_time = PythonOperator(
        task_id="populate_dim_time",
        python_callable=populate_dim_time,
    )

    t_log = PythonOperator(
        task_id="log_pipeline_run",
        python_callable=log_pipeline_run,
    )

    t_ohlcv >> t_dim_time >> t_log
