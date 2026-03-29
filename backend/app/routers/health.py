"""Health check endpoints: liveness and readiness probes."""

import time
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import SessionLocal
from app.config import settings

router = APIRouter()


@router.get("/health")
def liveness():
    """Lightweight liveness probe — always returns 200 if the process is alive."""
    return {"status": "ok"}


@router.get("/health/ready")
def readiness():
    """Readiness probe checking PostgreSQL, Redis, and data freshness."""
    checks: dict[str, dict] = {}
    overall = "healthy"

    # ── PostgreSQL ──
    try:
        t0 = time.monotonic()
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            latency_ms = round((time.monotonic() - t0) * 1000, 1)
            checks["database"] = {"status": "ok", "latency_ms": latency_ms}
        finally:
            db.close()
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)}
        overall = "unhealthy"

    # ── Redis ──
    try:
        import redis
        t0 = time.monotonic()
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        r.ping()
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        checks["redis"] = {"status": "ok", "latency_ms": latency_ms}
    except Exception as e:
        checks["redis"] = {"status": "error", "detail": str(e)}
        if overall == "healthy":
            overall = "degraded"

    # ── Data freshness ──
    try:
        db = SessionLocal()
        try:
            row = db.execute(text(
                "SELECT MAX(timestamp) AS latest FROM mv_latest_market_data"
            )).fetchone()
            if row and row[0]:
                latest = row[0]
                if latest.tzinfo is None:
                    latest = latest.replace(tzinfo=timezone.utc)
                age_minutes = (datetime.now(timezone.utc) - latest).total_seconds() / 60
                status_val = "ok" if age_minutes < 30 else "stale"
                checks["data_freshness"] = {
                    "status": status_val,
                    "last_update": latest.isoformat(),
                    "age_minutes": round(age_minutes, 1),
                }
                if status_val == "stale" and overall == "healthy":
                    overall = "degraded"
            else:
                checks["data_freshness"] = {"status": "no_data"}
                if overall == "healthy":
                    overall = "degraded"
        finally:
            db.close()
    except Exception as e:
        checks["data_freshness"] = {"status": "error", "detail": str(e)}
        if overall == "healthy":
            overall = "degraded"

    status_code = 200 if overall in ("healthy", "degraded") else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": overall, "checks": checks},
    )
