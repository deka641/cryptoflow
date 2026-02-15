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
