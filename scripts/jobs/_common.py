"""Shared utilities for batch jobs: connection management and pipeline logging."""
import logging
import os
from contextlib import contextmanager
from datetime import datetime, timezone

import psycopg2

logger = logging.getLogger(__name__)


@contextmanager
def db_connection(dsn: str | None = None):
    """Context manager for psycopg2 connections with proper cleanup."""
    conn = psycopg2.connect(dsn or os.environ["DATABASE_URL"])
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def log_pipeline_run(
    job_id: str,
    start_time: datetime,
    records_processed: int,
    error_message: str | None,
    dsn: str | None = None,
) -> None:
    """Log a pipeline run to the pipeline_runs table using its own connection."""
    end_time = datetime.now(timezone.utc)
    status = "success" if error_message is None else "failed"

    try:
        with db_connection(dsn) as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO pipeline_runs (dag_id, status, start_time, end_time, records_processed, error_message)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (job_id, status, start_time, end_time, records_processed, error_message))
            conn.commit()
            cur.close()
    except Exception as e:
        logger.error(f"Failed to log pipeline run: {e}")

    duration = (end_time - start_time).total_seconds()
    logger.info(f"Job finished: {status} ({records_processed} records in {duration:.1f}s)")
    return status
