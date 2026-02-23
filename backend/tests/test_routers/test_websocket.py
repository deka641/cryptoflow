from fastapi.testclient import TestClient

from app.main import app


def test_websocket_status():
    """GET /api/v1/ws/status returns expected fields."""
    with TestClient(app) as client:
        response = client.get("/api/v1/ws/status")
    assert response.status_code == 200
    data = response.json()
    assert "active_connections" in data
    assert "last_broadcast_at" in data
    assert "seconds_since_broadcast" in data
    assert "total_messages_broadcast" in data
    assert isinstance(data["active_connections"], int)
    assert isinstance(data["total_messages_broadcast"], int)


def test_websocket_connect():
    """WebSocket client can connect and receive ack."""
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/prices") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "ack"
            assert data["payload"] == "ping"


def test_websocket_status_endpoint():
    """The WS status endpoint should report connection stats."""
    with TestClient(app) as client:
        resp = client.get("/api/v1/ws/status")
        assert resp.status_code == 200
        data = resp.json()
        # Verify all expected connection stat fields are present
        assert "active_connections" in data
        assert "total_messages_broadcast" in data
        assert "last_broadcast_at" in data
        assert "seconds_since_broadcast" in data
        # Connection count and message count should be non-negative integers
        assert isinstance(data["active_connections"], int)
        assert data["active_connections"] >= 0
        assert isinstance(data["total_messages_broadcast"], int)
        assert data["total_messages_broadcast"] >= 0
