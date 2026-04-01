"""Tests for the public API endpoints (/api/v1/public/...)."""

from app.utils.rate_limiter import clear_all as _clear_public_rate_limits


def test_public_coins_list(client):
    _clear_public_rate_limits()
    resp = client.get("/api/v1/public/coins")
    assert resp.status_code == 200
    data = resp.json()
    # Paginated response with metadata
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data
    assert "pages" in data
    assert isinstance(data["items"], list)
    # If there are coins in the DB, validate structure
    if len(data["items"]) > 0:
        item = data["items"][0]
        assert "id" in item
        assert "symbol" in item
        assert "name" in item
        assert "market_cap_rank" in item
        # These may be None if no market data exists
        assert "price_usd" in item
        assert "market_cap" in item
        assert "total_volume" in item
        assert "price_change_24h_pct" in item


def test_public_coin_detail(client):
    _clear_public_rate_limits()
    # First get a real coin ID from the list
    list_resp = client.get("/api/v1/public/coins")
    assert list_resp.status_code == 200
    coins = list_resp.json()["items"]
    if len(coins) == 0:
        # No coins in DB, nothing to test for detail
        return

    coin_id = coins[0]["id"]
    resp = client.get(f"/api/v1/public/coins/{coin_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == coin_id
    assert "coingecko_id" in data
    assert "symbol" in data
    assert "name" in data
    assert "category" in data
    assert "market_cap_rank" in data
    assert "price_usd" in data
    assert "market_cap" in data
    assert "total_volume" in data
    assert "price_change_24h_pct" in data
    assert "circulating_supply" in data


def test_public_coin_not_found(client):
    _clear_public_rate_limits()
    resp = client.get("/api/v1/public/coins/99999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Coin not found"


def test_public_market_overview(client):
    _clear_public_rate_limits()
    resp = client.get("/api/v1/public/market/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_market_cap" in data
    assert "total_volume_24h" in data
    assert "btc_dominance" in data
    assert "active_coins" in data
    assert "top_gainers" in data
    assert "top_losers" in data
    assert isinstance(data["top_gainers"], list)
    assert isinstance(data["top_losers"], list)
    assert "market_cap_change_24h_pct" in data
    assert "volume_change_24h_pct" in data
    assert "last_updated" in data


def test_public_correlation(client):
    _clear_public_rate_limits()
    resp = client.get("/api/v1/public/analytics/correlation")
    assert resp.status_code == 200
    data = resp.json()
    assert "coins" in data
    assert "matrix" in data
    assert "period_days" in data
    assert data["period_days"] == 30
    assert isinstance(data["coins"], list)
    assert isinstance(data["matrix"], list)
    # Matrix should be square and match coins length
    n = len(data["coins"])
    assert len(data["matrix"]) == n
    for row in data["matrix"]:
        assert len(row) == n


def test_public_volatility(client):
    _clear_public_rate_limits()
    resp = client.get("/api/v1/public/analytics/volatility")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if len(data) > 0:
        item = data[0]
        assert "coin_id" in item
        assert "symbol" in item
        assert "name" in item
        assert "volatility" in item
        assert "max_drawdown" in item
        assert "sharpe_ratio" in item
        assert "period_days" in item
        assert "market_cap" in item
        assert "image_url" in item


def test_public_rate_limiting(client):
    _clear_public_rate_limits()
    # Send 60 requests (the limit)
    for i in range(60):
        resp = client.get("/api/v1/public/coins")
        assert resp.status_code == 200, f"Request {i + 1} failed with {resp.status_code}"

    # The 61st request should be rate limited
    resp = client.get("/api/v1/public/coins")
    assert resp.status_code == 429
    assert "Rate limit exceeded" in resp.json()["detail"]
