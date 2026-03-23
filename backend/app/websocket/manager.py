import time

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time price broadcasting."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._last_broadcast_time: float | None = None
        self._message_count: int = 0
        self._recent_broadcasts: list[float] = []

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

    @property
    def last_broadcast_time(self) -> float | None:
        return self._last_broadcast_time

    @property
    def message_count(self) -> int:
        return self._message_count

    @property
    def messages_per_minute(self) -> int:
        """Count of broadcasts in the last 60 seconds."""
        now = time.time()
        cutoff = now - 60.0
        # Prune old entries
        self._recent_broadcasts = [t for t in self._recent_broadcasts if t >= cutoff]
        return len(self._recent_broadcasts)

    @property
    def stats(self) -> dict:
        """Return all connection statistics."""
        return {
            "connection_count": self.connection_count,
            "message_count": self.message_count,
            "last_broadcast_time": self.last_broadcast_time,
            "messages_per_minute": self.messages_per_minute,
        }

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass

    async def broadcast(self, message: dict):
        now = time.time()
        self._last_broadcast_time = now
        self._message_count += 1
        self._recent_broadcasts.append(now)
        disconnected = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            try:
                self.active_connections.remove(conn)
            except ValueError:
                pass


manager = ConnectionManager()
