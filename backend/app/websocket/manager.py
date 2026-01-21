from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # Keeps track of active connections (users viewing the map)
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 New Client Connected. Total: {len(self.active_connections)}")
        await websocket.send_json({"message": "Connected to BUS KAR BAHI  WebSocket"})

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"🔌 Client Disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        # Send the bus location to EVERY connected user
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Error broadcasting: {e}")
                self.disconnect(connection)

# Global Instance
manager = ConnectionManager()