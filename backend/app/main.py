import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import api_router
from app.websocket.manager import manager

logger = logging.getLogger(__name__)


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(api_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
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


@app.get("/health")
def health_check():
    return {"status": "ok"}
