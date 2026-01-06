from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.bus import Bus
from app.models.etm_event import ETMEvent  # Ensure you import the Event model
from app.schemas.bus import BusCreate
from pydantic import BaseModel
from datetime import datetime
from app.models.etm_event import ETMEvent

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

# --- 3. NEW: Update Location Endpoint (Fixes 404 Error) ---
@router.post("/update-location")
def update_location(data: LocationUpdate, db: Session = Depends(get_db)):
    print(f"📍 Update: Bus {data.bus_id} -> {data.lat}, {data.lon}")

    # OPTIONAL: Save to DB (Unlock this if you want history)
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

    return {"status": "success", "bus_id": data.bus_id}