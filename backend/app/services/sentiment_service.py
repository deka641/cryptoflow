import httpx
import json
import logging

from app.config import settings

logger = logging.getLogger(__name__)

_FNG_API_URL = "https://api.alternative.me/fng/"
_CACHE_KEY = "sentiment:fng"
_CACHE_TTL = 3600  # 1 hour


def _get_redis():
    """Return a Redis client or None if unavailable."""
    try:
        import redis

        return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


async def get_fear_greed_index() -> dict:
    """Fetch the Fear & Greed Index with Redis caching (1-hour TTL).

    Returns a dict with ``value`` (int 0-100), ``value_classification``
    (e.g. "Fear", "Greed"), and ``history`` (last 30 daily entries).
    """
    # Try Redis cache first
    r = _get_redis()
    if r is not None:
        try:
            cached = r.get(_CACHE_KEY)
            if cached:
                return json.loads(cached)
        except Exception:
            logger.debug("Redis cache read failed for %s", _CACHE_KEY)

    # Fetch from Alternative.me API
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(_FNG_API_URL, params={"limit": 30, "format": "json"})
            resp.raise_for_status()
            data = resp.json()

        # Validate response structure before accessing
        entries = data.get("data")
        if not entries or not isinstance(entries, list) or len(entries) == 0:
            raise ValueError("Unexpected API response structure")

        result = {
            "value": int(entries[0]["value"]),
            "value_classification": entries[0]["value_classification"],
            "history": [
                {"value": int(d["value"]), "timestamp": d["timestamp"]}
                for d in entries
            ],
        }
    except Exception as exc:
        logger.warning("Fear & Greed API fetch failed: %s", exc)
        # Fall back to cached data if available
        if r is not None:
            try:
                cached = r.get(_CACHE_KEY)
                if cached:
                    logger.info("Returning cached sentiment data after API failure")
                    return json.loads(cached)
            except Exception:
                pass
        raise

    # Cache the result
    if r is not None:
        try:
            r.setex(_CACHE_KEY, _CACHE_TTL, json.dumps(result))
        except Exception:
            logger.debug("Redis cache write failed for %s", _CACHE_KEY)

    return result
