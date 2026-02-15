import pytest


def _register_and_get_token(client, email="watchlist@example.com"):
    """Register a user and return their auth token."""
    client.post("/api/v1/auth/register", json={
        "email": email, "password": "pass1234", "full_name": "WL User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email, "password": "pass1234",
    })
    return resp.json()["access_token"]


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_get_empty_watchlist(client):
    token = _register_and_get_token(client)
    resp = client.get("/api/v1/watchlist", headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["coin_ids"] == []


def test_add_to_watchlist(client, db):
    token = _register_and_get_token(client)
    # Use coin_id=1 (Bitcoin should exist in dim_coin)
    coin = db.execute(__import__("sqlalchemy").text("SELECT id FROM dim_coin LIMIT 1")).fetchone()
    if not coin:
        pytest.skip("No coins in dim_coin")
    coin_id = coin[0]

    resp = client.post(f"/api/v1/watchlist/{coin_id}", headers=_auth_header(token))
    assert resp.status_code == 201
    assert resp.json()["detail"] == "Added to watchlist"

    # Verify it shows up in the watchlist
    resp = client.get("/api/v1/watchlist", headers=_auth_header(token))
    assert coin_id in resp.json()["coin_ids"]


def test_add_duplicate_idempotent(client, db):
    token = _register_and_get_token(client)
    coin = db.execute(__import__("sqlalchemy").text("SELECT id FROM dim_coin LIMIT 1")).fetchone()
    if not coin:
        pytest.skip("No coins in dim_coin")
    coin_id = coin[0]

    client.post(f"/api/v1/watchlist/{coin_id}", headers=_auth_header(token))
    resp = client.post(f"/api/v1/watchlist/{coin_id}", headers=_auth_header(token))
    # Duplicate should be idempotent, not an error
    assert resp.status_code == 201
    assert resp.json()["detail"] == "Already in watchlist"

    # Should still only have one entry
    resp = client.get("/api/v1/watchlist", headers=_auth_header(token))
    assert resp.json()["coin_ids"].count(coin_id) == 1


def test_remove_from_watchlist(client, db):
    token = _register_and_get_token(client)
    coin = db.execute(__import__("sqlalchemy").text("SELECT id FROM dim_coin LIMIT 1")).fetchone()
    if not coin:
        pytest.skip("No coins in dim_coin")
    coin_id = coin[0]

    client.post(f"/api/v1/watchlist/{coin_id}", headers=_auth_header(token))
    resp = client.delete(f"/api/v1/watchlist/{coin_id}", headers=_auth_header(token))
    assert resp.status_code == 204

    # Verify it's gone
    resp = client.get("/api/v1/watchlist", headers=_auth_header(token))
    assert coin_id not in resp.json()["coin_ids"]


def test_remove_nonexistent(client):
    token = _register_and_get_token(client)
    resp = client.delete("/api/v1/watchlist/99999", headers=_auth_header(token))
    assert resp.status_code == 404


def test_add_invalid_coin(client):
    token = _register_and_get_token(client)
    resp = client.post("/api/v1/watchlist/99999", headers=_auth_header(token))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Coin not found"


def test_watchlist_requires_auth(client):
    resp = client.get("/api/v1/watchlist")
    assert resp.status_code in (401, 403)

    resp = client.post("/api/v1/watchlist/1")
    assert resp.status_code in (401, 403)

    resp = client.delete("/api/v1/watchlist/1")
    assert resp.status_code in (401, 403)
