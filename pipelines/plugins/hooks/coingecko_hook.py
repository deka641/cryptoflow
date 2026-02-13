"""
CoinGecko API Hook for Airflow.

Reusable client with rate limiting, retry logic, and methods for
fetching market data from the CoinGecko free API.
"""

import time
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"

# Minimum seconds between requests (~10 req/min free tier)
MIN_REQUEST_INTERVAL = 6.0

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF = 5.0  # seconds
BACKOFF_FACTOR = 2.0


class CoinGeckoHook:
    """
    A reusable CoinGecko API client with:
    - Rate limiting: enforces a minimum interval between requests.
    - Retry with exponential backoff on transient failures.
    """

    def __init__(self, base_url: str = COINGECKO_BASE_URL, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._last_request_time: float = 0.0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _wait_for_rate_limit(self) -> None:
        """Block until at least MIN_REQUEST_INTERVAL seconds have elapsed
        since the previous request."""
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < MIN_REQUEST_INTERVAL:
            sleep_time = MIN_REQUEST_INTERVAL - elapsed
            logger.debug("Rate-limit: sleeping %.2f s", sleep_time)
            time.sleep(sleep_time)

    def _request(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        """
        Perform a GET request with rate limiting and exponential-backoff
        retry on transient errors (429, 5xx, network issues).

        Returns the decoded JSON response body.
        Raises ``httpx.HTTPStatusError`` after exhausting retries.
        """
        url = f"{self.base_url}{endpoint}"
        backoff = INITIAL_BACKOFF

        for attempt in range(1, MAX_RETRIES + 1):
            self._wait_for_rate_limit()

            try:
                logger.info(
                    "CoinGecko request [attempt %d/%d]: GET %s params=%s",
                    attempt,
                    MAX_RETRIES,
                    url,
                    params,
                )
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.get(url, params=params)

                self._last_request_time = time.monotonic()

                # Happy path
                if response.status_code == 200:
                    return response.json()

                # Rate-limited or server error -> retry
                if response.status_code == 429 or response.status_code >= 500:
                    logger.warning(
                        "CoinGecko returned %d – retrying in %.1f s …",
                        response.status_code,
                        backoff,
                    )
                    time.sleep(backoff)
                    backoff *= BACKOFF_FACTOR
                    continue

                # Client error that is not retryable
                response.raise_for_status()

            except httpx.TransportError as exc:
                logger.warning(
                    "Transport error on attempt %d: %s – retrying in %.1f s …",
                    attempt,
                    exc,
                    backoff,
                )
                self._last_request_time = time.monotonic()
                time.sleep(backoff)
                backoff *= BACKOFF_FACTOR

        # All retries exhausted – make one final attempt and let it raise
        self._wait_for_rate_limit()
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(url, params=params)
        self._last_request_time = time.monotonic()
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Public API methods
    # ------------------------------------------------------------------

    def get_coins_markets(
        self,
        vs_currency: str = "usd",
        per_page: int = 50,
        page: int = 1,
        order: str = "market_cap_desc",
        sparkline: bool = False,
        price_change_percentage: str = "24h",
    ) -> list[dict[str, Any]]:
        """
        Fetch a page of coin market data.

        Corresponds to ``GET /coins/markets``.
        Returns a list of coin dicts with price, market_cap, volume, etc.
        """
        params = {
            "vs_currency": vs_currency,
            "order": order,
            "per_page": per_page,
            "page": page,
            "sparkline": str(sparkline).lower(),
            "price_change_percentage": price_change_percentage,
        }
        data = self._request("/coins/markets", params=params)
        logger.info("Fetched %d coins from /coins/markets", len(data))
        return data

    def get_market_chart(
        self,
        coin_id: str,
        vs_currency: str = "usd",
        days: int = 90,
    ) -> dict[str, Any]:
        """
        Fetch historical market chart data for a single coin.

        Corresponds to ``GET /coins/{id}/market_chart``.
        Returns dict with keys: prices, market_caps, total_volumes.
        Each value is a list of [timestamp_ms, value] pairs.
        """
        params = {
            "vs_currency": vs_currency,
            "days": days,
        }
        data = self._request(f"/coins/{coin_id}/market_chart", params=params)
        n_prices = len(data.get("prices", []))
        logger.info(
            "Fetched %d price points for coin '%s' (days=%d)",
            n_prices,
            coin_id,
            days,
        )
        return data
