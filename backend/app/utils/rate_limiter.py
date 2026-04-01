"""Shared rate limiter with Redis-first strategy and in-memory fallback.

Used by auth endpoints and public API to enforce per-IP request limits.
Redis ensures limits work across multiple Uvicorn workers.
"""

import logging
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.config import settings

_logger = logging.getLogger(__name__)

# Shared Redis client (lazy-initialized)
_redis_client = None

# In-memory fallback state
_rate_limit_attempts: dict[str, list[float]] = defaultdict(list)
_last_sweep: float = 0.0
_SWEEP_INTERVAL = 60.0


def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception:
            _redis_client = False
            _logger.info("Redis unavailable for rate limiting, using in-memory fallback")
    return _redis_client if _redis_client is not False else None


def clear_all():
    """Clear all rate limit state (for testing)."""
    _rate_limit_attempts.clear()
    r = _get_redis()
    if r:
        try:
            for key in r.scan_iter("rate_limit:*"):
                r.delete(key)
        except Exception:
            pass


def check_rate_limit(
    request: Request,
    prefix: str,
    max_requests: int,
    window_seconds: int = 60,
    detail: str = "Rate limit exceeded.",
) -> dict[str, str]:
    """Check rate limit and raise 429 if exceeded.

    Returns a dict of rate-limit headers to attach to the response.
    """
    ip = request.client.host if request.client else "unknown"
    r = _get_redis()
    remaining = max_requests
    reset_seconds = window_seconds

    if r:
        key = f"rate_limit:{prefix}:{ip}"
        try:
            current = r.incr(key)
            if current == 1:
                r.expire(key, window_seconds)
            ttl = r.ttl(key)
            reset_seconds = max(ttl, 1)
            remaining = max(max_requests - current, 0)
            if current > max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=detail,
                    headers={
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_seconds),
                        "Retry-After": str(reset_seconds),
                    },
                )
            return {
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_seconds),
            }
        except HTTPException:
            raise
        except Exception:
            pass  # Fall through to in-memory

    # In-memory fallback
    mem_key = f"{prefix}:{ip}"
    now = time.monotonic()
    attempts = _rate_limit_attempts[mem_key]
    cleaned = [t for t in attempts if now - t < window_seconds]
    if not cleaned:
        _rate_limit_attempts.pop(mem_key, None)
        cleaned = []
    else:
        _rate_limit_attempts[mem_key] = cleaned

    remaining = max(max_requests - len(cleaned), 0)

    if len(cleaned) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(window_seconds),
                "Retry-After": str(window_seconds),
            },
        )
    _rate_limit_attempts.setdefault(mem_key, []).append(now)

    # Periodic TTL-based sweep
    global _last_sweep
    if now - _last_sweep > _SWEEP_INTERVAL:
        _last_sweep = now
        stale_keys = [
            k for k, v in _rate_limit_attempts.items()
            if not v or now - v[-1] >= window_seconds
        ]
        for k in stale_keys:
            _rate_limit_attempts.pop(k, None)

    return {
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(window_seconds),
    }
