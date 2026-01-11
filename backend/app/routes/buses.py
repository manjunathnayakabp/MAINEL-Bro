from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.bus import Bus
from app.models.etm_event import ETMEvent
from app.schemas.bus import BusCreate
from app.websocket.manager import manager
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/buses", tags=["Buses"])

# --- 1. Schema for Incoming GPS Data ---
class LocationUpdate(BaseModel):
    bus_id: str
    route_id: str
    lat: float
    lon: float
    speed: float
    timestamp: str

# --- 2. Existing Add Bus Endpoint ---
@router.post("/")
def add_bus(bus: BusCreate, db: Session = Depends(get_db)):
    # Check if bus already exists to avoid crashing
    existing_bus = db.query(Bus).filter(Bus.bus_number == bus.bus_number).first()
    if existing_bus:
        raise HTTPException(status_code=400, detail="Bus already exists")
    
    new_bus = Bus(
        bus_number=bus.bus_number,
        capacity=bus.capacity,
        condition=bus.condition
    )
    db.add(new_bus)
    db.commit()
    db.refresh(new_bus)
    return {"message": "Bus added", "bus": new_bus.bus_number}

# --- 3. Combined Update Location Endpoint ---
@router.post("/update-location")
async def update_location(
    data: LocationUpdate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # A. Log to Console
    print(f"📍 Update: Bus {data.bus_id} -> {data.lat}, {data.lon}")

    # B. Save to Database (History)
    # We wrap this in try/except so a DB error doesn't stop the live tracking
    try:
        new_event = ETMEvent(
            bus_id=data.bus_id,
            route_id=int(data.route_id),
            lat=data.lat,
            lon=data.lon,
            speed=data.speed,
            timestamp=datetime.fromisoformat(data.timestamp)
        )
        db.add(new_event)
        db.commit()
    except Exception as e:
        print(f"⚠️ Error saving to DB: {e}")
    
    # C. Broadcast to WebSocket (Real-Time)
    # Using jsonable_encoder ensures the data is perfectly formatted for JSON
    payload = jsonable_encoder(data)
    background_tasks.add_task(manager.broadcast, payload)

    return {"status": "success", "bus_id": data.bus_id}