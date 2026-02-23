def test_register(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "testuser@example.com",
        "password": "Secure1234",
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


def test_register_invalid_email(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "Secure1234",
    })
    assert resp.status_code == 422


def test_register_short_password(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "short@example.com",
        "password": "Ab1",
    })
    assert resp.status_code == 422
    assert "8 characters" in resp.json()["detail"][0]["msg"]


def test_register_password_no_digit(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "nodigit@example.com",
        "password": "abcdefgh",
    })
    assert resp.status_code == 422
    assert "digit" in resp.json()["detail"][0]["msg"]


def test_register_password_no_letter(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "noletter@example.com",
        "password": "12345678",
    })
    assert resp.status_code == 422
    assert "letter" in resp.json()["detail"][0]["msg"]


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


def test_login_invalid_email(client):
    resp = client.post("/api/v1/auth/login", json={
        "email": "not-an-email",
        "password": "pass1234",
    })
    assert resp.status_code == 422


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={
        "email": "wrong@example.com", "password": "correct1A",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com", "password": "incorrect1B",
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


def test_me_malformed_token(client):
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt.token"},
    )
    assert resp.status_code == 401


def test_me_expired_token(client):
    """An expired token should be rejected."""
    from unittest.mock import patch
    from app.auth.jwt import create_access_token

    with patch("app.auth.jwt.settings") as mock_settings:
        mock_settings.JWT_SECRET = "super-secret-change-in-production"
        mock_settings.JWT_ALGORITHM = "HS256"
        mock_settings.JWT_EXPIRE_MINUTES = -1  # already expired
        token = create_access_token(data={"sub": "9999"})

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
