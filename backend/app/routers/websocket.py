from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/prices")
async def websocket_prices(websocket: WebSocket):
    """Accept a WebSocket connection and stream real-time price updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive by waiting for incoming messages.
            # The client can send ping/subscription messages; the server
            # pushes price updates via manager.broadcast().
            data = await websocket.receive_text()
            # Echo back as acknowledgement (optional: parse subscription filters)
            await websocket.send_json({"type": "ack", "payload": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
