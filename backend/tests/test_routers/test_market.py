def test_market_overview(client):
    resp = client.get("/api/v1/market/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_market_cap" in data
    assert "total_volume_24h" in data
    assert "btc_dominance" in data
    assert "active_coins" in data
    assert "top_gainers" in data
    assert "top_losers" in data


def test_market_overview_has_change_fields(client):
    resp = client.get("/api/v1/market/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "market_cap_change_24h_pct" in data
    assert "volume_change_24h_pct" in data


def test_market_overview_gainers_losers_structure(client):
    resp = client.get("/api/v1/market/overview")
    data = resp.json()
    for mover in data["top_gainers"] + data["top_losers"]:
        assert "id" in mover
        assert "symbol" in mover
        assert "name" in mover
        assert "price_usd" in mover
        assert "price_change_24h_pct" in mover


def test_market_overview_numeric_types(client):
    resp = client.get("/api/v1/market/overview")
    data = resp.json()
    assert isinstance(data["total_market_cap"], (int, float))
    assert isinstance(data["total_volume_24h"], (int, float))
    assert isinstance(data["btc_dominance"], (int, float))
    assert isinstance(data["active_coins"], (int, float))


def test_kpi_sparklines(client):
    resp = client.get("/api/v1/market/kpi-sparklines")
    assert resp.status_code == 200
    data = resp.json()
    assert "market_cap" in data
    assert "volume" in data
    assert "btc_dominance" in data
    assert isinstance(data["market_cap"], list)
    assert isinstance(data["volume"], list)
    assert isinstance(data["btc_dominance"], list)


def test_kpi_sparklines_values_are_numeric(client):
    resp = client.get("/api/v1/market/kpi-sparklines")
    data = resp.json()
    for key in ("market_cap", "volume", "btc_dominance"):
        for val in data[key]:
            assert isinstance(val, (int, float))
