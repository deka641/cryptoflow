"""
DAG: ingest_historical
=======================
Runs daily at 02:00 UTC.  Fetches 90 days of historical price data for the
top 20 coins (by market-cap rank stored in dim_coin) from CoinGecko's
``/coins/{id}/market_chart`` endpoint.

Inserts into ``fact_market_data`` with ON CONFLICT DO NOTHING so the DAG
is fully idempotent and safe to re-run.

Coins are processed sequentially with rate-limiting pauses to stay within
CoinGecko's free-tier budget (~10 req/min).
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

import httpx
import psycopg2
import psycopg2.extras

from airflow import DAG
from airflow.operators.python import PythonOperator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
COINGECKO_BASE = "https://api.coingecko.com/api/v3"
MIN_REQ_INTERVAL = 6.0
MAX_RETRIES = 3
INITIAL_BACKOFF = 5.0

DB_DSN = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"
HISTORY_DAYS = 90
TOP_N_COINS = 20
BATCH_INSERT_SIZE = 500

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CoinGecko request helper (self-contained)
# ---------------------------------------------------------------------------
_last_req_time: float = 0.0


def _cg_get(endpoint: str, params: dict | None = None):
    global _last_req_time
    url = f"{COINGECKO_BASE}{endpoint}"
    backoff = INITIAL_BACKOFF

    for attempt in range(1, MAX_RETRIES + 1):
        elapsed = time.monotonic() - _last_req_time
        if elapsed < MIN_REQ_INTERVAL:
            time.sleep(MIN_REQ_INTERVAL - elapsed)

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(url, params=params)
            _last_req_time = time.monotonic()

            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429 or resp.status_code >= 500:
                logger.warning("CoinGecko %d – backing off %.1fs", resp.status_code, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            resp.raise_for_status()
        except httpx.TransportError as exc:
            logger.warning("Transport error attempt %d: %s", attempt, exc)
            _last_req_time = time.monotonic()
            time.sleep(backoff)
            backoff *= 2

    # Final attempt
    elapsed = time.monotonic() - _last_req_time
    if elapsed < MIN_REQ_INTERVAL:
        time.sleep(MIN_REQ_INTERVAL - elapsed)
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params)
    _last_req_time = time.monotonic()
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

def _get_conn():
    return psycopg2.connect(DB_DSN)


# ---------------------------------------------------------------------------
# Task callables
# ---------------------------------------------------------------------------

def get_top_coins(**context):
    """Query dim_coin for the top N coins by market_cap_rank."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, coingecko_id
                FROM dim_coin
                WHERE market_cap_rank IS NOT NULL
                ORDER BY market_cap_rank ASC
                LIMIT %s
                """,
                (TOP_N_COINS,),
            )
            coins = [{"db_id": row[0], "coingecko_id": row[1]} for row in cur.fetchall()]
    finally:
        conn.close()

    logger.info("Found %d coins to fetch historical data for", len(coins))
    # Push as simple list of dicts (small enough for XCom default JSON)
    context["ti"].xcom_push(key="coins", value=coins)
    return len(coins)


def fetch_and_insert_history(**context):
    """
    For each coin returned by ``get_top_coins``, call CoinGecko market_chart
    and insert rows into fact_market_data.  ON CONFLICT DO NOTHING ensures
    idempotency.
    """
    coins = context["ti"].xcom_pull(task_ids="get_top_coins", key="coins")
    if not coins:
        logger.warning("No coins to process")
        return 0

    total_inserted = 0
    conn = _get_conn()

    try:
        for coin in coins:
            cg_id = coin["coingecko_id"]
            db_id = coin["db_id"]

            logger.info("Fetching %d-day history for %s …", HISTORY_DAYS, cg_id)
            data = _cg_get(
                f"/coins/{cg_id}/market_chart",
                params={"vs_currency": "usd", "days": HISTORY_DAYS},
            )

            prices = data.get("prices", [])
            market_caps = data.get("market_caps", [])
            total_volumes = data.get("total_volumes", [])

            # Build lookup by timestamp_ms for caps and volumes
            cap_map = {int(ts): val for ts, val in market_caps}
            vol_map = {int(ts): val for ts, val in total_volumes}

            rows = []
            for ts_ms, price in prices:
                ts_ms_int = int(ts_ms)
                ts = datetime.fromtimestamp(ts_ms_int / 1000, tz=timezone.utc)
                rows.append((
                    db_id,
                    ts,
                    price,
                    cap_map.get(ts_ms_int),
                    vol_map.get(ts_ms_int),
                    None,  # price_change_24h_pct – not available in chart data
                    None,  # circulating_supply – not available in chart data
                ))

            if not rows:
                logger.info("No price points for %s", cg_id)
                continue

            # Batch insert with ON CONFLICT DO NOTHING
            insert_sql = """
                INSERT INTO fact_market_data
                    (coin_id, timestamp, price_usd, market_cap, total_volume,
                     price_change_24h_pct, circulating_supply)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """
            with conn.cursor() as cur:
                # Insert in batches to keep memory manageable
                for i in range(0, len(rows), BATCH_INSERT_SIZE):
                    batch = rows[i : i + BATCH_INSERT_SIZE]
                    psycopg2.extras.execute_batch(cur, insert_sql, batch, page_size=100)
            conn.commit()

            total_inserted += len(rows)
            logger.info("Inserted up to %d rows for %s (ON CONFLICT DO NOTHING)",
                        len(rows), cg_id)

    finally:
        conn.close()

    logger.info("Total historical rows inserted (attempted): %d", total_inserted)
    context["ti"].xcom_push(key="total_inserted", value=total_inserted)
    return total_inserted


def log_pipeline_run(**context):
    """Record the pipeline run in pipeline_runs."""
    ti = context["ti"]
    total = ti.xcom_pull(task_ids="fetch_and_insert_history", key="total_inserted") or 0
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
                    "ingest_historical",
                    "success",
                    dag_run.start_date,
                    datetime.now(timezone.utc),
                    total,
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
    dag_id="ingest_historical",
    default_args=default_args,
    description="Backfill 90-day historical market data for top 20 coins (daily)",
    schedule_interval="0 2 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["cryptoflow", "ingest", "historical"],
) as dag:

    t_coins = PythonOperator(
        task_id="get_top_coins",
        python_callable=get_top_coins,
    )

    t_history = PythonOperator(
        task_id="fetch_and_insert_history",
        python_callable=fetch_and_insert_history,
        execution_timeout=timedelta(minutes=30),
    )

    t_log = PythonOperator(
        task_id="log_pipeline_run",
        python_callable=log_pipeline_run,
    )

    t_coins >> t_history >> t_log
