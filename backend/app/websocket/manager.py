import time

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time price broadcasting."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._last_broadcast_time: float | None = None
        self._message_count: int = 0

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

    @property
    def last_broadcast_time(self) -> float | None:
        return self._last_broadcast_time

    @property
    def message_count(self) -> int:
        return self._message_count

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass

    async def broadcast(self, message: dict):
        self._last_broadcast_time = time.time()
        self._message_count += 1
        disconnected = []
        for connection in self.active_connections:
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
