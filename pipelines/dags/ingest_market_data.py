"""
DAG: ingest_market_data
========================
Runs every 10 minutes.  Fetches current market data for the top 50 coins
from CoinGecko, upserts coin dimensions, inserts a market-data snapshot,
refreshes the materialised view, and logs the pipeline run.

Chain:  fetch_market_data >> upsert_coins >> insert_market_snapshot
        >> refresh_materialized_view >> log_pipeline_run
"""

from __future__ import annotations

import json
import logging
import sys
import time
from datetime import datetime, timedelta, timezone

import psycopg2
import psycopg2.extras

from airflow import DAG
from airflow.operators.python import PythonOperator

# ---------------------------------------------------------------------------
# Inline CoinGecko helper (DAGs must be self-contained)
# ---------------------------------------------------------------------------
import httpx

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
MIN_REQ_INTERVAL = 6.0
MAX_RETRIES = 3
INITIAL_BACKOFF = 5.0

DB_DSN = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CoinGecko request helper
# ---------------------------------------------------------------------------
_last_req_time: float = 0.0


def _cg_get(endpoint: str, params: dict | None = None) -> dict | list:
    """Rate-limited GET with exponential-backoff retry."""
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
                logger.warning("CoinGecko %d on attempt %d, backing off %.1fs",
                               resp.status_code, attempt, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            resp.raise_for_status()
        except httpx.TransportError as exc:
            logger.warning("Transport error attempt %d: %s", attempt, exc)
            _last_req_time = time.monotonic()
            time.sleep(backoff)
            backoff *= 2

    # Final attempt – let errors propagate
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

def fetch_market_data(**context):
    """Fetch top-50 coins from CoinGecko /coins/markets and push via XCom."""
    data = _cg_get("/coins/markets", params={
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 50,
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    })
    logger.info("Fetched %d coins from CoinGecko", len(data))
    # Push as JSON string to avoid XCom serialisation quirks
    context["ti"].xcom_push(key="market_data", value=json.dumps(data))
    return len(data)


def upsert_coins(**context):
    """Insert or update dim_coin from the fetched market data."""
    raw = context["ti"].xcom_pull(task_ids="fetch_market_data", key="market_data")
    coins = json.loads(raw)

    sql = """
        INSERT INTO dim_coin (coingecko_id, symbol, name, category, description,
                              image_url, market_cap_rank, created_at, updated_at)
        VALUES (%(coingecko_id)s, %(symbol)s, %(name)s, %(category)s, %(description)s,
                %(image_url)s, %(market_cap_rank)s, NOW(), NOW())
        ON CONFLICT (coingecko_id) DO UPDATE SET
            symbol          = EXCLUDED.symbol,
            name            = EXCLUDED.name,
            image_url       = EXCLUDED.image_url,
            market_cap_rank = EXCLUDED.market_cap_rank,
            updated_at      = NOW()
    """

    rows = []
    for c in coins:
        rows.append({
            "coingecko_id": c["id"],
            "symbol": c.get("symbol", ""),
            "name": c.get("name", ""),
            "category": None,
            "description": None,
            "image_url": c.get("image", ""),
            "market_cap_rank": c.get("market_cap_rank"),
        })

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, rows, page_size=100)
        conn.commit()
        logger.info("Upserted %d coins into dim_coin", len(rows))
    finally:
        conn.close()

    return len(rows)


def insert_market_snapshot(**context):
    """Insert current market snapshot into fact_market_data."""
    raw = context["ti"].xcom_pull(task_ids="fetch_market_data", key="market_data")
    coins = json.loads(raw)
    now = datetime.now(timezone.utc)

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            # Build a lookup: coingecko_id -> dim_coin.id
            cur.execute("SELECT id, coingecko_id FROM dim_coin")
            coin_map = {row[1]: row[0] for row in cur.fetchall()}

            rows = []
            for c in coins:
                coin_id = coin_map.get(c["id"])
                if coin_id is None:
                    logger.warning("Coin %s not found in dim_coin, skipping", c["id"])
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

            insert_sql = """
                INSERT INTO fact_market_data
                    (coin_id, timestamp, price_usd, market_cap, total_volume,
                     price_change_24h_pct, circulating_supply)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            psycopg2.extras.execute_batch(
                cur, insert_sql,
                rows,
                page_size=100,
            )
        conn.commit()
        logger.info("Inserted %d rows into fact_market_data", len(rows))
        context["ti"].xcom_push(key="rows_inserted", value=len(rows))
    finally:
        conn.close()

    return len(rows)


def refresh_materialized_view(**context):
    """Refresh the mv_latest_market_data materialised view."""
    conn = _get_conn()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_market_data")
        logger.info("Materialized view mv_latest_market_data refreshed")
    finally:
        conn.close()


def log_pipeline_run(**context):
    """Write a record into pipeline_runs for observability."""
    ti = context["ti"]
    rows_inserted = ti.xcom_pull(task_ids="insert_market_snapshot", key="rows_inserted") or 0
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
                    "ingest_market_data",
                    "success",
                    dag_run.start_date,
                    datetime.now(timezone.utc),
                    rows_inserted,
                ),
            )
        conn.commit()
        logger.info("Logged pipeline run: %d records processed", rows_inserted)
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
    dag_id="ingest_market_data",
    default_args=default_args,
    description="Fetch top-50 coin market data every 10 minutes",
    schedule_interval="*/10 * * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["cryptoflow", "ingest"],
) as dag:

    t_fetch = PythonOperator(
        task_id="fetch_market_data",
        python_callable=fetch_market_data,
    )

    t_upsert = PythonOperator(
        task_id="upsert_coins",
        python_callable=upsert_coins,
    )

    t_insert = PythonOperator(
        task_id="insert_market_snapshot",
        python_callable=insert_market_snapshot,
    )

    t_refresh = PythonOperator(
        task_id="refresh_materialized_view",
        python_callable=refresh_materialized_view,
    )

    t_log = PythonOperator(
        task_id="log_pipeline_run",
        python_callable=log_pipeline_run,
    )

    t_fetch >> t_upsert >> t_insert >> t_refresh >> t_log
