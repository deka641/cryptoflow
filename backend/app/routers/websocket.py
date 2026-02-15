import asyncio
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/prices")
async def websocket_prices(websocket: WebSocket):
    """Accept a WebSocket connection and stream real-time price updates."""
    await manager.connect(websocket)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                await websocket.send_json({"type": "ack", "payload": data})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.get("/status")
async def websocket_status():
    """Return current WebSocket connection statistics."""
    last = manager.last_broadcast_time
    return {
        "active_connections": manager.connection_count,
        "last_broadcast_at": last,
        "seconds_since_broadcast": round(time.time() - last, 1) if last else None,
        "total_messages_broadcast": manager.message_count,
    }
