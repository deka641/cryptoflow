"""Tests for app.services.sentiment_service (get_fear_greed_index)."""

import json
from unittest.mock import patch, MagicMock, AsyncMock

import httpx
import pytest

from app.services.sentiment_service import get_fear_greed_index


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

_VALID_FNG_RESPONSE = {
    "data": [
        {"value": "72", "value_classification": "Greed", "timestamp": "1711497600"},
        {"value": "65", "value_classification": "Greed", "timestamp": "1711411200"},
        {"value": "55", "value_classification": "Neutral", "timestamp": "1711324800"},
    ]
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_successful_api_fetch():
    """When the external API returns valid data, parse and return it."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = _VALID_FNG_RESPONSE

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.sentiment_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.sentiment_service._get_redis", return_value=None):
        result = await get_fear_greed_index()

    assert result["value"] == 72
    assert result["value_classification"] == "Greed"
    assert len(result["history"]) == 3


@pytest.mark.asyncio
async def test_cache_hit_skips_api():
    """When cached data exists in Redis, return it without calling the API."""
    cached = json.dumps({
        "value": 42,
        "value_classification": "Fear",
        "history": [{"value": 42, "timestamp": "1711497600"}],
    })

    mock_redis = MagicMock()
    mock_redis.get.return_value = cached

    with patch("app.services.sentiment_service._get_redis", return_value=mock_redis):
        result = await get_fear_greed_index()

    assert result["value"] == 42
    assert result["value_classification"] == "Fear"


@pytest.mark.asyncio
async def test_api_failure_falls_back_to_cache():
    """When the API fails, fall back to cached data."""
    cached = json.dumps({
        "value": 30,
        "value_classification": "Fear",
        "history": [{"value": 30, "timestamp": "1711497600"}],
    })

    mock_redis = MagicMock()
    # First call returns None (cache miss), triggering API call
    # Second call (in the except block) returns cached data
    mock_redis.get.side_effect = [None, cached]

    mock_client = AsyncMock()
    mock_client.get.side_effect = httpx.HTTPError("Connection refused")
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.sentiment_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.sentiment_service._get_redis", return_value=mock_redis):
        result = await get_fear_greed_index()

    assert result["value"] == 30


@pytest.mark.asyncio
async def test_api_failure_no_cache_raises():
    """When the API fails and no cache is available, re-raise the exception."""
    mock_client = AsyncMock()
    mock_client.get.side_effect = httpx.HTTPError("Connection refused")
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.sentiment_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.sentiment_service._get_redis", return_value=None):
        with pytest.raises(httpx.HTTPError):
            await get_fear_greed_index()


@pytest.mark.asyncio
async def test_malformed_api_response_falls_back():
    """When the API returns unexpected structure, fall back to cache."""
    cached = json.dumps({
        "value": 50,
        "value_classification": "Neutral",
        "history": [],
    })

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"unexpected": "structure"}

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    mock_redis = MagicMock()
    mock_redis.get.side_effect = [None, cached]

    with patch("app.services.sentiment_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.sentiment_service._get_redis", return_value=mock_redis):
        result = await get_fear_greed_index()

    assert result["value"] == 50


@pytest.mark.asyncio
async def test_empty_data_array_falls_back():
    """When the API returns empty data array, fall back to cache."""
    cached = json.dumps({
        "value": 60,
        "value_classification": "Greed",
        "history": [],
    })

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"data": []}

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    mock_redis = MagicMock()
    mock_redis.get.side_effect = [None, cached]

    with patch("app.services.sentiment_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.sentiment_service._get_redis", return_value=mock_redis):
        result = await get_fear_greed_index()

    assert result["value"] == 60
