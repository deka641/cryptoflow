"""
DAG: data_quality_checks
=========================
Runs every hour.  Performs four data-quality checks against
``fact_market_data`` and logs results into ``data_quality_checks``.

Checks
------
1. **freshness**          – Is the newest row < 30 minutes old?
2. **completeness**       – Does the latest snapshot contain all coins?
3. **null_check**         – Are there any NULL prices in the last 100 rows?
4. **anomaly_detection**  – Any price change > 50 % within a 10-minute window?
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

import psycopg2
import psycopg2.extras

from airflow import DAG
from airflow.operators.python import PythonOperator

DB_DSN = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"

logger = logging.getLogger(__name__)


def _get_conn():
    return psycopg2.connect(DB_DSN)


def _insert_check(cur, check_name: str, table_name: str, status: str, details: str):
    """Helper to insert a single check result."""
    cur.execute(
        """
        INSERT INTO data_quality_checks
            (check_name, table_name, status, details, executed_at)
        VALUES (%s, %s, %s, %s, NOW())
        """,
        (check_name, table_name, status, details),
    )


# ---------------------------------------------------------------------------
# Individual check callables
# ---------------------------------------------------------------------------

def check_freshness(**context):
    """
    PASS if the most recent row in fact_market_data is less than 30 minutes old.
    FAIL otherwise.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT MAX(timestamp) FROM fact_market_data"
            )
            row = cur.fetchone()
            max_ts = row[0] if row else None

            if max_ts is None:
                status = "failed"
                details = "No data in fact_market_data"
            else:
                # Ensure max_ts is tz-aware
                if max_ts.tzinfo is None:
                    max_ts = max_ts.replace(tzinfo=timezone.utc)
                age = datetime.now(timezone.utc) - max_ts
                age_minutes = age.total_seconds() / 60.0
                if age_minutes <= 30:
                    status = "passed"
                    details = f"Latest data is {age_minutes:.1f} minutes old"
                else:
                    status = "failed"
                    details = f"Latest data is {age_minutes:.1f} minutes old (threshold: 30 min)"

            logger.info("Freshness check: %s – %s", status, details)
            _insert_check(cur, "freshness", "fact_market_data", status, details)
        conn.commit()
    finally:
        conn.close()

    context["ti"].xcom_push(key="freshness_status", value=status)


def check_completeness(**context):
    """
    PASS if the latest snapshot (within 15 min window) contains all coins that
    exist in dim_coin.  WARNING if some are missing.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            # Total coins known
            cur.execute("SELECT COUNT(*) FROM dim_coin")
            total_coins = cur.fetchone()[0]

            # Distinct coins in the last 15 minutes
            cur.execute(
                """
                SELECT COUNT(DISTINCT coin_id)
                FROM fact_market_data
                WHERE timestamp >= NOW() - INTERVAL '15 minutes'
                """
            )
            recent_coins = cur.fetchone()[0]

            if total_coins == 0:
                status = "warning"
                details = "dim_coin is empty"
            elif recent_coins >= total_coins:
                status = "passed"
                details = f"All {total_coins} coins present in latest snapshot"
            else:
                missing = total_coins - recent_coins
                status = "warning"
                details = (
                    f"Only {recent_coins}/{total_coins} coins in latest snapshot "
                    f"({missing} missing)"
                )

            logger.info("Completeness check: %s – %s", status, details)
            _insert_check(cur, "completeness", "fact_market_data", status, details)
        conn.commit()
    finally:
        conn.close()

    context["ti"].xcom_push(key="completeness_status", value=status)


def check_nulls(**context):
    """
    PASS if there are zero NULL price_usd values in the last 100 rows.
    FAIL otherwise.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS null_count
                FROM (
                    SELECT price_usd
                    FROM fact_market_data
                    ORDER BY timestamp DESC
                    LIMIT 100
                ) recent
                WHERE recent.price_usd IS NULL
                """
            )
            null_count = cur.fetchone()[0]

            if null_count == 0:
                status = "passed"
                details = "No NULL prices in the last 100 rows"
            else:
                status = "failed"
                details = f"Found {null_count} NULL price_usd values in the last 100 rows"

            logger.info("Null check: %s – %s", status, details)
            _insert_check(cur, "null_check", "fact_market_data", status, details)
        conn.commit()
    finally:
        conn.close()

    context["ti"].xcom_push(key="null_check_status", value=status)


def check_anomaly_detection(**context):
    """
    WARNING if any coin shows a > 50 % price change within any 10-minute
    window in the last hour.  This uses a self-join on fact_market_data to
    compare each row with the nearest earlier row for the same coin.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH recent AS (
                    SELECT coin_id, timestamp, price_usd
                    FROM fact_market_data
                    WHERE timestamp >= NOW() - INTERVAL '1 hour'
                      AND price_usd IS NOT NULL
                      AND price_usd > 0
                ),
                lagged AS (
                    SELECT
                        r1.coin_id,
                        r1.timestamp AS ts1,
                        r1.price_usd AS price1,
                        r2.timestamp AS ts2,
                        r2.price_usd AS price2,
                        ABS(r1.price_usd - r2.price_usd) / r2.price_usd * 100.0 AS pct_change
                    FROM recent r1
                    JOIN recent r2
                      ON r1.coin_id = r2.coin_id
                     AND r1.timestamp > r2.timestamp
                     AND r1.timestamp <= r2.timestamp + INTERVAL '10 minutes'
                )
                SELECT coin_id, MAX(pct_change) AS max_pct
                FROM lagged
                WHERE pct_change > 50
                GROUP BY coin_id
                """
            )
            anomalies = cur.fetchall()

            if not anomalies:
                status = "passed"
                details = "No price anomalies (>50% change in 10 min) detected"
            else:
                status = "warning"
                anomaly_info = [
                    {"coin_id": row[0], "max_pct_change": round(row[1], 2)}
                    for row in anomalies
                ]
                details = (
                    f"Detected {len(anomalies)} coin(s) with >50% price change "
                    f"in 10 min: {json.dumps(anomaly_info)}"
                )

            logger.info("Anomaly detection: %s – %s", status, details)
            _insert_check(cur, "anomaly_detection", "fact_market_data", status, details)
        conn.commit()
    finally:
        conn.close()

    context["ti"].xcom_push(key="anomaly_status", value=status)


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------

default_args = {
    "owner": "cryptoflow",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="data_quality_checks",
    default_args=default_args,
    description="Hourly data-quality checks on fact_market_data",
    schedule_interval="@hourly",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["cryptoflow", "quality"],
) as dag:

    t_freshness = PythonOperator(
        task_id="check_freshness",
        python_callable=check_freshness,
    )

    t_completeness = PythonOperator(
        task_id="check_completeness",
        python_callable=check_completeness,
    )

    t_nulls = PythonOperator(
        task_id="check_nulls",
        python_callable=check_nulls,
    )

    t_anomaly = PythonOperator(
        task_id="check_anomaly_detection",
        python_callable=check_anomaly_detection,
    )

    # All four checks can run in parallel – no dependencies between them
    [t_freshness, t_completeness, t_nulls, t_anomaly]
