def test_register(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "testuser@example.com",
        "password": "securepassword",
        "full_name": "Test User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "testuser@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data


def test_register_duplicate(client):
    payload = {"email": "dup@example.com", "password": "pass1234", "full_name": "Dup"}
    client.post("/api/v1/auth/register", json=payload)
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


def test_login(client):
    client.post("/api/v1/auth/register", json={
        "email": "login@example.com", "password": "pass1234",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "login@example.com", "password": "pass1234",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={
        "email": "wrong@example.com", "password": "correct",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com", "password": "incorrect",
    })
    assert resp.status_code == 401


def test_me(client):
    client.post("/api/v1/auth/register", json={
        "email": "me@example.com", "password": "pass1234", "full_name": "Me",
    })
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "me@example.com", "password": "pass1234",
    })
    token = login_resp.json()["access_token"]
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


def test_me_unauthorized(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)
