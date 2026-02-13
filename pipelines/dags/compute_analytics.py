"""
DAG: compute_analytics
=======================
Runs daily at 04:00 UTC.  Uses pandas/numpy to compute:

1. **Correlation matrix** – Pearson correlation of daily close prices for
   all coin pairs over 30-day and 90-day windows.
2. **Volatility** – Standard deviation of daily returns (30d, 90d).
3. **Max drawdown** – Largest peak-to-trough decline (30d, 90d).
4. **Sharpe ratio** – ``(mean_daily_return / std_daily_return) * sqrt(365)``
   with risk-free rate = 0.

Results are upserted into ``analytics_correlation`` and
``analytics_volatility``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from itertools import combinations

import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras

from airflow import DAG
from airflow.operators.python import PythonOperator

DB_DSN = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"

logger = logging.getLogger(__name__)


def _get_conn():
    return psycopg2.connect(DB_DSN)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_daily_closes(conn, lookback_days: int) -> pd.DataFrame:
    """
    Return a DataFrame with columns = coin_id and index = date,
    values = close_price from fact_daily_ohlcv for the last
    ``lookback_days`` days.
    """
    sql = """
        SELECT coin_id, date, close_price
        FROM fact_daily_ohlcv
        WHERE date >= CURRENT_DATE - %s
          AND close_price IS NOT NULL
        ORDER BY date
    """
    with conn.cursor() as cur:
        cur.execute(sql, (lookback_days,))
        rows = cur.fetchall()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["coin_id", "date", "close_price"])
    pivot = df.pivot(index="date", columns="coin_id", values="close_price")
    return pivot


def _compute_max_drawdown(prices: pd.Series) -> float:
    """Maximum drawdown as a positive percentage (e.g. 25.0 for 25% decline)."""
    if prices.empty or len(prices) < 2:
        return 0.0
    cummax = prices.cummax()
    drawdown = (prices - cummax) / cummax
    return float(abs(drawdown.min()) * 100)


# ---------------------------------------------------------------------------
# Task callables
# ---------------------------------------------------------------------------

def compute_correlations(**context):
    """
    Compute Pearson correlation of daily close prices for all coin pairs
    over 30-day and 90-day periods.  Upsert into analytics_correlation.
    """
    conn = _get_conn()
    try:
        now = datetime.now(timezone.utc)
        upsert_sql = """
            INSERT INTO analytics_correlation
                (coin_a_id, coin_b_id, period_days, correlation, computed_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (coin_a_id, coin_b_id, period_days) DO UPDATE SET
                correlation = EXCLUDED.correlation,
                computed_at = EXCLUDED.computed_at
        """

        total_rows = 0

        for period in (30, 90):
            closes = _load_daily_closes(conn, period)
            if closes.empty or closes.shape[1] < 2:
                logger.warning("Not enough data for %d-day correlation", period)
                continue

            # Drop coins with too few data points (need at least half the period)
            min_points = period // 2
            closes = closes.dropna(axis=1, thresh=min_points)

            if closes.shape[1] < 2:
                logger.warning("Not enough coins with sufficient data for %d-day correlation", period)
                continue

            corr_matrix = closes.corr(method="pearson")
            coin_ids = list(corr_matrix.columns)

            rows = []
            for a, b in combinations(coin_ids, 2):
                val = corr_matrix.loc[a, b]
                if pd.isna(val):
                    continue
                rows.append((int(a), int(b), period, float(val), now))

            if rows:
                with conn.cursor() as cur:
                    psycopg2.extras.execute_batch(cur, upsert_sql, rows, page_size=200)
                conn.commit()
                total_rows += len(rows)
                logger.info("Upserted %d correlation rows for %d-day period",
                            len(rows), period)

        context["ti"].xcom_push(key="correlation_rows", value=total_rows)
    finally:
        conn.close()

    return total_rows


def compute_volatility_metrics(**context):
    """
    Compute volatility, max drawdown, and Sharpe ratio for each coin
    over 30-day and 90-day windows.  Upsert into analytics_volatility.
    """
    conn = _get_conn()
    try:
        now = datetime.now(timezone.utc)
        upsert_sql = """
            INSERT INTO analytics_volatility
                (coin_id, period_days, volatility, max_drawdown, sharpe_ratio, computed_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (coin_id, period_days) DO UPDATE SET
                volatility   = EXCLUDED.volatility,
                max_drawdown = EXCLUDED.max_drawdown,
                sharpe_ratio = EXCLUDED.sharpe_ratio,
                computed_at  = EXCLUDED.computed_at
        """

        total_rows = 0

        for period in (30, 90):
            closes = _load_daily_closes(conn, period)
            if closes.empty:
                logger.warning("No close price data for %d-day volatility", period)
                continue

            rows = []
            for coin_id in closes.columns:
                series = closes[coin_id].dropna()
                if len(series) < 3:
                    continue

                # Daily returns
                returns = series.pct_change().dropna()
                if returns.empty:
                    continue

                # Volatility = std of daily returns (as percentage)
                vol = float(returns.std() * 100)

                # Max drawdown (percentage)
                mdd = _compute_max_drawdown(series)

                # Sharpe ratio: (mean_daily_return / std_daily_return) * sqrt(365)
                std_ret = float(returns.std())
                if std_ret > 0:
                    sharpe = float((returns.mean() / std_ret) * np.sqrt(365))
                else:
                    sharpe = 0.0

                rows.append((
                    int(coin_id),
                    period,
                    round(vol, 6),
                    round(mdd, 4),
                    round(sharpe, 4),
                    now,
                ))

            if rows:
                with conn.cursor() as cur:
                    psycopg2.extras.execute_batch(cur, upsert_sql, rows, page_size=200)
                conn.commit()
                total_rows += len(rows)
                logger.info("Upserted %d volatility rows for %d-day period",
                            len(rows), period)

        context["ti"].xcom_push(key="volatility_rows", value=total_rows)
    finally:
        conn.close()

    return total_rows


def log_pipeline_run(**context):
    """Record the analytics pipeline run."""
    ti = context["ti"]
    corr_rows = ti.xcom_pull(task_ids="compute_correlations", key="correlation_rows") or 0
    vol_rows = ti.xcom_pull(task_ids="compute_volatility_metrics", key="volatility_rows") or 0
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
                    "compute_analytics",
                    "success",
                    dag_run.start_date,
                    datetime.now(timezone.utc),
                    corr_rows + vol_rows,
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
    dag_id="compute_analytics",
    default_args=default_args,
    description="Daily computation of correlation, volatility, drawdown, and Sharpe ratio",
    schedule_interval="0 4 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["cryptoflow", "analytics"],
) as dag:

    t_corr = PythonOperator(
        task_id="compute_correlations",
        python_callable=compute_correlations,
    )

    t_vol = PythonOperator(
        task_id="compute_volatility_metrics",
        python_callable=compute_volatility_metrics,
    )

    t_log = PythonOperator(
        task_id="log_pipeline_run",
        python_callable=log_pipeline_run,
    )

    # Correlations and volatility can run in parallel; logging waits for both
    [t_corr, t_vol] >> t_log
