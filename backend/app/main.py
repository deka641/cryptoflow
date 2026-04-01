import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware

from app.config import settings
from app.routers import api_router
from app.routers.health import router as health_router
from app.websocket.manager import manager

logger = logging.getLogger(__name__)


async def _check_realtime_alerts(price_data: dict):
    """Check if any live price updates trigger user alerts and push via WebSocket."""
    if not manager.user_connections:
        return
    try:
        from app.database import SessionLocal
        from app.models.alert import PriceAlert
        from app.models.coin import DimCoin
        from datetime import datetime, timezone

        db = SessionLocal()
        try:
            # Map coingecko_id to price from the broadcast data
            # price_data is {coingecko_id: price_string, ...}
            if not isinstance(price_data, dict):
                return

            # Get all user IDs with active connections
            connected_user_ids = list(manager.user_connections.keys())
            if not connected_user_ids:
                return

            # Fetch untriggered alerts for connected users
            alerts = (
                db.query(PriceAlert)
                .filter(
                    PriceAlert.user_id.in_(connected_user_ids),
                    PriceAlert.triggered == False,  # noqa: E712
                )
                .all()
            )
            if not alerts:
                return

            # Build coin_id -> coingecko_id mapping for alerts
            coin_ids = list({a.coin_id for a in alerts})
            coins = {c.id: c for c in db.query(DimCoin).filter(DimCoin.id.in_(coin_ids)).all()}

            for alert in alerts:
                coin = coins.get(alert.coin_id)
                if not coin or coin.coingecko_id not in price_data:
                    continue
                try:
                    current_price = float(price_data[coin.coingecko_id])
                except (ValueError, TypeError):
                    continue

                should_trigger = (
                    (alert.direction == "above" and current_price >= float(alert.target_price))
                    or (alert.direction == "below" and current_price <= float(alert.target_price))
                )
                if should_trigger:
                    alert.triggered = True
                    alert.triggered_at = datetime.now(timezone.utc)
                    await manager.send_to_user(alert.user_id, {
                        "type": "alert_triggered",
                        "data": {
                            "alert_id": alert.id,
                            "coin_id": alert.coin_id,
                            "symbol": coin.symbol,
                            "name": coin.name,
                            "direction": alert.direction,
                            "target_price": float(alert.target_price),
                            "current_price": current_price,
                        },
                    })
            db.commit()
        finally:
            db.close()
    except Exception:
        logger.debug("Realtime alert check error", exc_info=True)


async def _redis_subscriber(redis_url: str, channel: str):
    """Subscribe to Redis pub/sub and broadcast price updates to WebSocket clients."""
    import redis.asyncio as aioredis

    while True:
        try:
            r = aioredis.from_url(redis_url)
            pubsub = r.pubsub()
            await pubsub.subscribe(channel)
            logger.info("Redis subscriber connected to channel %s", channel)
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    data = json.loads(message["data"])
                    await manager.broadcast(data)
                    # Check if any live prices trigger user alerts
                    await _check_realtime_alerts(data)
                except json.JSONDecodeError:
                    logger.warning("Malformed JSON from Redis, skipping")
                except Exception:
                    logger.exception("Error broadcasting message")
        except asyncio.CancelledError:
            logger.info("Redis subscriber shutting down")
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
                await r.aclose()
            except Exception:
                pass
            return
        except Exception:
            logger.exception("Redis subscriber error, reconnecting in 5s")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(
        _redis_subscriber(settings.REDIS_URL, "crypto:prices")
    )
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="CryptoFlow API",
    description="Real-Time Crypto Data Pipeline & Analytics Platform",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Cache-control headers by URL prefix
_CACHE_RULES: list[tuple[str, str]] = [
    ("/api/v1/public", "public, max-age=60"),
    ("/api/v1/analytics", "public, max-age=3600"),
    ("/api/v1/market", "public, max-age=60"),
    ("/api/v1/coins", "public, max-age=300"),
    ("/api/v1/auth", "no-store"),
    ("/health", "no-store"),
]


@app.middleware("http")
async def origin_validation(request: Request, call_next):
    """Validate Origin header on state-changing requests to prevent CSRF."""
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("origin")
        if origin:
            allowed = settings.CORS_ORIGINS
            if origin not in allowed:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Origin not allowed"},
                )
    return await call_next(request)


@app.middleware("http")
async def request_logging_and_cache(request: Request, call_next):
    """Log requests with timing and add cache-control headers."""
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    path = request.url.path

    # Skip logging for health checks and WebSocket upgrades
    if path != "/health" and "upgrade" not in (request.headers.get("connection", "").lower()):
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(level, "%s %s %d %.0fms", request.method, path, response.status_code, duration_ms)

    # Add cache-control headers (skip auth-mutating methods)
    if request.method == "GET" and "cache-control" not in response.headers:
        for prefix, cache_value in _CACHE_RULES:
            if path.startswith(prefix):
                response.headers["Cache-Control"] = cache_value
                break

    return response


app.include_router(api_router)
app.include_router(health_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Handle database statement timeout as 504
    from sqlalchemy.exc import OperationalError
    if isinstance(exc, OperationalError) and "statement timeout" in str(exc):
        logger.warning("Statement timeout on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=504,
            content={"detail": "Query took too long. Try a shorter time range or fewer items."},
        )
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Sanitize errors: remove non-JSON-serializable 'ctx' field while
    # preserving the standard FastAPI response format (detail = list of errors)
    errors = []
    for err in exc.errors():
        clean = {k: v for k, v in err.items() if k != "ctx"}
        errors.append(clean)
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )


