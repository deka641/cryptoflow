def test_list_coins(client):
    resp = client.get("/api/v1/coins")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


def test_list_coins_pagination(client):
    resp = client.get("/api/v1/coins?page=1&per_page=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["per_page"] == 5
    assert len(data["items"]) <= 5


def test_list_coins_search(client):
    resp = client.get("/api/v1/coins?search=bitcoin")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert "bitcoin" in item["name"].lower() or "btc" in item["symbol"].lower()


def test_get_coin_not_found(client):
    resp = client.get("/api/v1/coins/99999")
    assert resp.status_code == 404


def test_get_coin_history_not_found(client):
    resp = client.get("/api/v1/coins/99999/history")
    assert resp.status_code == 404


def test_get_coin_ohlcv(client):
    resp = client.get("/api/v1/coins/2/ohlcv?days=30")
    assert resp.status_code == 200
    data = resp.json()
    assert "coin_id" in data
    assert "symbol" in data
    assert "name" in data
    assert "candles" in data
    assert isinstance(data["candles"], list)
    if len(data["candles"]) > 0:
        candle = data["candles"][0]
        assert "date" in candle
        assert "open" in candle
        assert "high" in candle
        assert "low" in candle
        assert "close" in candle
        assert "volume" in candle


def test_get_coin_ohlcv_not_found(client):
    resp = client.get("/api/v1/coins/99999/ohlcv")
    assert resp.status_code == 404


def test_get_coin_ohlcv_days_param(client):
    resp_7 = client.get("/api/v1/coins/2/ohlcv?days=7")
    resp_90 = client.get("/api/v1/coins/2/ohlcv?days=90")
    assert resp_7.status_code == 200
    assert resp_90.status_code == 200
    assert len(resp_90.json()["candles"]) >= len(resp_7.json()["candles"])
