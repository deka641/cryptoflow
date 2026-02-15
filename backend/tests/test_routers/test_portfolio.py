import pytest
from sqlalchemy import text


def _register_and_get_token(client, email="portfolio@example.com"):
    """Register a user and return their auth token."""
    client.post("/api/v1/auth/register", json={
        "email": email, "password": "pass1234", "full_name": "Portfolio User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email, "password": "pass1234",
    })
    return resp.json()["access_token"]


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _get_coin(db):
    coin = db.execute(text("SELECT id FROM dim_coin LIMIT 1")).fetchone()
    if not coin:
        pytest.skip("No coins in dim_coin")
    return coin[0]


def _get_two_coins(db):
    coins = db.execute(text("SELECT id FROM dim_coin LIMIT 2")).fetchall()
    if len(coins) < 2:
        pytest.skip("Need at least 2 coins in dim_coin")
    return coins[0][0], coins[1][0]


def test_portfolio_requires_auth(client):
    resp = client.get("/api/v1/portfolio")
    assert resp.status_code in (401, 403)

    resp = client.get("/api/v1/portfolio/holdings")
    assert resp.status_code in (401, 403)

    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": 1, "quantity": 1.0, "buy_price_usd": 100.0,
    })
    assert resp.status_code in (401, 403)

    resp = client.put("/api/v1/portfolio/holdings/1", json={"quantity": 2.0})
    assert resp.status_code in (401, 403)

    resp = client.delete("/api/v1/portfolio/holdings/1")
    assert resp.status_code in (401, 403)

    resp = client.get("/api/v1/portfolio/performance")
    assert resp.status_code in (401, 403)


def test_get_empty_portfolio_summary(client):
    token = _register_and_get_token(client, "empty-summary@example.com")
    resp = client.get("/api/v1/portfolio", headers=_auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_value_usd"] == 0
    assert data["total_cost_basis_usd"] == 0
    assert data["holdings_count"] == 0
    assert data["unique_coins"] == 0


def test_get_empty_holdings_list(client):
    token = _register_and_get_token(client, "empty-holdings@example.com")
    resp = client.get("/api/v1/portfolio/holdings", headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json() == []


def test_add_holding(client, db):
    token = _register_and_get_token(client, "add-holding@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 1.5, "buy_price_usd": 50000.0,
    }, headers=_auth_header(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["coin_id"] == coin_id
    assert data["quantity"] == 1.5
    assert data["buy_price_usd"] == 50000.0
    assert data["cost_basis_usd"] == 75000.0
    assert "coingecko_id" in data
    assert "symbol" in data
    assert "name" in data

    # Verify it shows up in holdings list
    resp = client.get("/api/v1/portfolio/holdings", headers=_auth_header(token))
    assert resp.status_code == 200
    holdings = resp.json()
    assert len(holdings) == 1
    assert holdings[0]["coin_id"] == coin_id


def test_add_holding_invalid_coin(client):
    token = _register_and_get_token(client, "invalid-coin@example.com")
    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": 99999, "quantity": 1.0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Coin not found"


def test_add_holding_zero_quantity(client, db):
    token = _register_and_get_token(client, "zero-qty@example.com")
    coin_id = _get_coin(db)
    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token))
    assert resp.status_code == 422


def test_add_holding_with_notes(client, db):
    token = _register_and_get_token(client, "notes@example.com")
    coin_id = _get_coin(db)
    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 2.0, "buy_price_usd": 100.0,
        "notes": "DCA purchase #1",
    }, headers=_auth_header(token))
    assert resp.status_code == 201
    assert resp.json()["notes"] == "DCA purchase #1"


def test_multiple_holdings_same_coin(client, db):
    token = _register_and_get_token(client, "multi-lot@example.com")
    coin_id = _get_coin(db)

    # Add two lots of the same coin
    client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 1.0, "buy_price_usd": 40000.0,
    }, headers=_auth_header(token))
    client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 0.5, "buy_price_usd": 45000.0,
    }, headers=_auth_header(token))

    # Both should appear in holdings list
    resp = client.get("/api/v1/portfolio/holdings", headers=_auth_header(token))
    holdings = resp.json()
    assert len(holdings) == 2

    # Summary should show correct aggregation
    resp = client.get("/api/v1/portfolio", headers=_auth_header(token))
    summary = resp.json()
    assert summary["holdings_count"] == 2
    assert summary["unique_coins"] == 1
    expected_cost = 1.0 * 40000.0 + 0.5 * 45000.0
    assert summary["total_cost_basis_usd"] == expected_cost


def test_update_holding(client, db):
    token = _register_and_get_token(client, "update@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 1.0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token))
    holding_id = resp.json()["id"]

    resp = client.put(f"/api/v1/portfolio/holdings/{holding_id}", json={
        "quantity": 2.5, "buy_price_usd": 150.0,
    }, headers=_auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["quantity"] == 2.5
    assert data["buy_price_usd"] == 150.0

    # Verify change persists
    resp = client.get("/api/v1/portfolio/holdings", headers=_auth_header(token))
    assert resp.json()[0]["quantity"] == 2.5


def test_update_holding_not_found(client):
    token = _register_and_get_token(client, "update-404@example.com")
    resp = client.put("/api/v1/portfolio/holdings/99999", json={
        "quantity": 2.0,
    }, headers=_auth_header(token))
    assert resp.status_code == 404


def test_update_holding_other_user(client, db):
    token_a = _register_and_get_token(client, "owner-a@example.com")
    token_b = _register_and_get_token(client, "owner-b@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 1.0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token_a))
    holding_id = resp.json()["id"]

    # User B cannot update User A's holding
    resp = client.put(f"/api/v1/portfolio/holdings/{holding_id}", json={
        "quantity": 999.0,
    }, headers=_auth_header(token_b))
    assert resp.status_code == 404


def test_delete_holding(client, db):
    token = _register_and_get_token(client, "delete@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 1.0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token))
    holding_id = resp.json()["id"]

    resp = client.delete(f"/api/v1/portfolio/holdings/{holding_id}", headers=_auth_header(token))
    assert resp.status_code == 204

    # Verify it's gone
    resp = client.get("/api/v1/portfolio/holdings", headers=_auth_header(token))
    assert resp.json() == []


def test_delete_holding_not_found(client):
    token = _register_and_get_token(client, "delete-404@example.com")
    resp = client.delete("/api/v1/portfolio/holdings/99999", headers=_auth_header(token))
    assert resp.status_code == 404


def test_delete_holding_other_user(client, db):
    token_a = _register_and_get_token(client, "del-owner-a@example.com")
    token_b = _register_and_get_token(client, "del-owner-b@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_id, "quantity": 1.0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token_a))
    holding_id = resp.json()["id"]

    # User B cannot delete User A's holding
    resp = client.delete(f"/api/v1/portfolio/holdings/{holding_id}", headers=_auth_header(token_b))
    assert resp.status_code == 404


def test_portfolio_summary_with_holdings(client, db):
    token = _register_and_get_token(client, "summary@example.com")
    coin_a, coin_b = _get_two_coins(db)

    client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_a, "quantity": 2.0, "buy_price_usd": 100.0,
    }, headers=_auth_header(token))
    client.post("/api/v1/portfolio/holdings", json={
        "coin_id": coin_b, "quantity": 3.0, "buy_price_usd": 50.0,
    }, headers=_auth_header(token))

    resp = client.get("/api/v1/portfolio", headers=_auth_header(token))
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["holdings_count"] == 2
    assert summary["unique_coins"] == 2
    assert summary["total_cost_basis_usd"] == 2.0 * 100.0 + 3.0 * 50.0


def test_portfolio_performance_empty(client):
    token = _register_and_get_token(client, "perf-empty@example.com")
    resp = client.get("/api/v1/portfolio/performance?days=30", headers=_auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["days"] == 30
    assert data["data_points"] == []
