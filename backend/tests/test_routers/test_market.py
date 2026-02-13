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
