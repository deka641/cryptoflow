import time
import httpx
from app.config import settings


class CoinGeckoClient:
    """Rate-limited CoinGecko API client with retry logic."""

    def __init__(self):
        self.base_url = settings.COINGECKO_BASE_URL
        self.rate_limit = settings.COINGECKO_RATE_LIMIT
        self._last_request_time = 0.0
        self._min_interval = 60.0 / self.rate_limit

    def _wait_for_rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request_time = time.time()

    def _request(self, endpoint: str, params: dict | None = None, retries: int = 3) -> dict | list:
        self._wait_for_rate_limit()
        url = f"{self.base_url}{endpoint}"
        for attempt in range(retries):
            try:
                with httpx.Client(timeout=30) as client:
                    resp = client.get(url, params=params)
                    if resp.status_code == 429:
                        wait = 2 ** (attempt + 1) * 10
                        time.sleep(wait)
                        continue
                    resp.raise_for_status()
                    return resp.json()
            except (httpx.HTTPError, httpx.TimeoutException):
                if attempt == retries - 1:
                    raise
                time.sleep(2 ** attempt)
        return {}

    def get_coins_markets(
        self, vs_currency: str = "usd", per_page: int = 50, page: int = 1
    ) -> list[dict]:
        return self._request(
            "/coins/markets",
            params={
                "vs_currency": vs_currency,
                "order": "market_cap_desc",
                "per_page": per_page,
                "page": page,
                "sparkline": "false",
                "price_change_percentage": "24h",
            },
        )

    def get_coin_detail(self, coin_id: str) -> dict:
        return self._request(
            f"/coins/{coin_id}",
            params={"localization": "false", "tickers": "false", "community_data": "false"},
        )

    def get_market_chart(self, coin_id: str, days: int = 90, vs_currency: str = "usd") -> dict:
        return self._request(
            f"/coins/{coin_id}/market_chart",
            params={"vs_currency": vs_currency, "days": str(days)},
        )


coingecko_client = CoinGeckoClient()
