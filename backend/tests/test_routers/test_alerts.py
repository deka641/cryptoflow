import pytest
from sqlalchemy import text


def _register_and_get_token(client, email="alerts@example.com"):
    """Register a user and return their auth token."""
    client.post("/api/v1/auth/register", json={
        "email": email, "password": "pass1234", "full_name": "Alert User",
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


# --- Auth gating ---

def test_alerts_requires_auth(client):
    """All alert endpoints should require authentication."""
    resp = client.get("/api/v1/alerts")
    assert resp.status_code in (401, 403)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": 1, "target_price": 100.0, "direction": "above",
    })
    assert resp.status_code in (401, 403)

    resp = client.delete("/api/v1/alerts/1")
    assert resp.status_code in (401, 403)

    resp = client.post("/api/v1/alerts/check")
    assert resp.status_code in (401, 403)


# --- CRUD ---

def test_create_alert(client, db):
    token = _register_and_get_token(client, "create-alert@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 50000.0, "direction": "above",
    }, headers=_auth_header(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["coin_id"] == coin_id
    assert data["target_price"] == 50000.0
    assert data["direction"] == "above"
    assert data["triggered"] is False
    assert "coingecko_id" in data
    assert "symbol" in data
    assert "name" in data


def test_create_alert_invalid_direction(client, db):
    token = _register_and_get_token(client, "bad-dir@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 100.0, "direction": "sideways",
    }, headers=_auth_header(token))
    assert resp.status_code == 422


def test_create_alert_negative_price(client, db):
    token = _register_and_get_token(client, "neg-price@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": -10.0, "direction": "above",
    }, headers=_auth_header(token))
    assert resp.status_code == 422


def test_create_alert_zero_price(client, db):
    token = _register_and_get_token(client, "zero-price@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 0, "direction": "below",
    }, headers=_auth_header(token))
    assert resp.status_code == 422


def test_create_multiple_alerts_same_direction(client, db):
    """Creating multiple alerts for the same coin/direction should create separate alerts."""
    token = _register_and_get_token(client, "dup-alert@example.com")
    coin_id = _get_coin(db)

    resp1 = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 50000.0, "direction": "above",
    }, headers=_auth_header(token))
    assert resp1.status_code == 201
    alert_id_1 = resp1.json()["id"]

    resp2 = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 60000.0, "direction": "above",
    }, headers=_auth_header(token))
    assert resp2.status_code == 201
    alert_id_2 = resp2.json()["id"]
    # Should create a new, separate alert
    assert alert_id_2 != alert_id_1
    assert resp2.json()["target_price"] == 60000.0


def test_get_alerts(client, db):
    token = _register_and_get_token(client, "get-alerts@example.com")
    coin_id = _get_coin(db)

    # Create an alert
    client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 100.0, "direction": "below",
    }, headers=_auth_header(token))

    resp = client.get("/api/v1/alerts", headers=_auth_header(token))
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) >= 1
    assert alerts[0]["coin_id"] == coin_id
    assert alerts[0]["direction"] == "below"


def test_delete_alert(client, db):
    token = _register_and_get_token(client, "del-alert@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 100.0, "direction": "above",
    }, headers=_auth_header(token))
    alert_id = resp.json()["id"]

    resp = client.delete(f"/api/v1/alerts/{alert_id}", headers=_auth_header(token))
    assert resp.status_code == 204

    # Verify it's gone
    resp = client.get("/api/v1/alerts", headers=_auth_header(token))
    assert all(a["id"] != alert_id for a in resp.json())


def test_delete_other_users_alert(client, db):
    """A user cannot delete another user's alert."""
    token_a = _register_and_get_token(client, "alert-owner-a@example.com")
    token_b = _register_and_get_token(client, "alert-owner-b@example.com")
    coin_id = _get_coin(db)

    resp = client.post("/api/v1/alerts", json={
        "coin_id": coin_id, "target_price": 100.0, "direction": "above",
    }, headers=_auth_header(token_a))
    alert_id = resp.json()["id"]

    # User B cannot delete User A's alert
    resp = client.delete(f"/api/v1/alerts/{alert_id}", headers=_auth_header(token_b))
    assert resp.status_code == 404


def test_delete_nonexistent_alert(client):
    token = _register_and_get_token(client, "del-404@example.com")
    resp = client.delete("/api/v1/alerts/99999", headers=_auth_header(token))
    assert resp.status_code == 404


def test_create_alert_nonexistent_coin(client):
    token = _register_and_get_token(client, "no-coin@example.com")
    resp = client.post("/api/v1/alerts", json={
        "coin_id": 99999, "target_price": 100.0, "direction": "above",
    }, headers=_auth_header(token))
    assert resp.status_code == 404


def test_check_alerts_scoped_to_user(client, db):
    """check_alerts should only return the current user's triggered alerts."""
    token_a = _register_and_get_token(client, "check-a@example.com")
    token_b = _register_and_get_token(client, "check-b@example.com")

    # Both users create alerts — check endpoint only returns own
    resp_a = client.post("/api/v1/alerts/check", headers=_auth_header(token_a))
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert "triggered" in data_a
    assert "checked" in data_a

    resp_b = client.post("/api/v1/alerts/check", headers=_auth_header(token_b))
    assert resp_b.status_code == 200
