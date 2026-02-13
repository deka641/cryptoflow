def test_correlation(client):
    resp = client.get("/api/v1/analytics/correlation?period_days=30")
    assert resp.status_code == 200
    data = resp.json()
    assert "coins" in data
    assert "matrix" in data
    assert "period_days" in data


def test_volatility(client):
    resp = client.get("/api/v1/analytics/volatility?period_days=30")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
