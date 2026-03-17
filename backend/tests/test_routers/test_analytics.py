import pytest


def test_correlation(client):
    resp = client.get("/api/v1/analytics/correlation?period_days=30")
    assert resp.status_code == 200
    data = resp.json()
    assert "coins" in data
    assert "matrix" in data
    assert "period_days" in data


def test_correlation_matrix_symmetry(client):
    resp = client.get("/api/v1/analytics/correlation?period_days=30")
    data = resp.json()
    matrix = data["matrix"]
    if len(matrix) > 1:
        for i in range(len(matrix)):
            for j in range(len(matrix[i])):
                if matrix[i][j] is not None and matrix[j][i] is not None:
                    assert abs(matrix[i][j] - matrix[j][i]) < 0.001, (
                        f"Matrix not symmetric at [{i}][{j}]"
                    )


def test_correlation_period_days_reflected(client):
    resp = client.get("/api/v1/analytics/correlation?period_days=90")
    assert resp.status_code == 200
    data = resp.json()
    assert data["period_days"] == 90


def test_correlation_invalid_period(client):
    resp = client.get("/api/v1/analytics/correlation?period_days=0")
    assert resp.status_code == 422


def test_volatility(client):
    resp = client.get("/api/v1/analytics/volatility?period_days=30")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if len(data) > 0:
        entry = data[0]
        assert "market_cap" in entry
        assert "image_url" in entry
        assert "volatility" in entry
        assert "sharpe_ratio" in entry
        assert "max_drawdown" in entry


def test_volatility_ranking_order(client):
    """Volatility entries should be sorted by volatility descending (highest first)."""
    resp = client.get("/api/v1/analytics/volatility?period_days=30")
    data = resp.json()
    vols = [e["volatility"] for e in data if e["volatility"] is not None]
    if len(vols) > 1:
        assert vols == sorted(vols, reverse=True), "Volatility not sorted descending"


def test_volatility_invalid_period(client):
    resp = client.get("/api/v1/analytics/volatility?period_days=0")
    assert resp.status_code == 422


def test_volatility_history_valid_coin(client):
    # First get a valid coin id
    coins_resp = client.get("/api/v1/coins?page=1&per_page=1")
    if coins_resp.status_code != 200 or not coins_resp.json()["items"]:
        pytest.skip("No coins available")
    coin_id = coins_resp.json()["items"][0]["id"]

    resp = client.get(f"/api/v1/analytics/volatility/{coin_id}/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "coin_id" in data
    assert "entries" in data
    assert isinstance(data["entries"], list)


def test_volatility_history_nonexistent_coin(client):
    resp = client.get("/api/v1/analytics/volatility/999999/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data["entries"] == []


def test_correlation_coins_list_matches_matrix(client):
    resp = client.get("/api/v1/analytics/correlation?period_days=30")
    data = resp.json()
    coins = data["coins"]
    matrix = data["matrix"]
    if len(coins) > 0:
        assert len(matrix) == len(coins)
        for row in matrix:
            assert len(row) == len(coins)
