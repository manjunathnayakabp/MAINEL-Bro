from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager

router = APIRouter(tags=["Real-Time Tracking"])

@router.websocket("/ws/tracking")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open, waiting for messages (or just listening)
            # We don't expect the User to send data, only receive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)