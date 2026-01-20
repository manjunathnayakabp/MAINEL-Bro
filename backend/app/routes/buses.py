from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.bus import Bus
from app.models.etm_event import ETMEvent
from app.schemas.bus import BusCreate
from app.websocket.manager import manager

# Rule engines
from app.services.delay_rules import calculate_delay_status
from app.services.allocation_rules import check_allocation_needs

router = APIRouter(prefix="/buses", tags=["Buses"])

# ------------------------------------------------------------------
# 1. SCHEMA: Incoming GPS + Traffic + Crowd Data
# ------------------------------------------------------------------
class LocationUpdate(BaseModel):
    bus_id: str
    route_id: str
    lat: float
    lon: float
    speed: float
    traffic_level: int = 0
    passenger_count: int = 0
    capacity: int = 50
    timestamp: str


# ------------------------------------------------------------------
# 2. ADD BUS ENDPOINT
# ------------------------------------------------------------------
@router.post("/")
def add_bus(bus: BusCreate, db: Session = Depends(get_db)):
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

    return {
        "message": "Bus added successfully",
        "bus": new_bus.bus_number
    }


# ------------------------------------------------------------------
# 3. UPDATE LOCATION (LIVE TRACKING + RULE ENGINE)
# ------------------------------------------------------------------
@router.post("/update-location")
async def update_location(
    data: LocationUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # ---------------- LOG ----------------
    print(
        f"📍 Bus {data.bus_id} | "
        f"Traffic: {data.traffic_level}% | "
        f"Passengers: {data.passenger_count}/{data.capacity}"
    )

    # ---------------- DELAY RULES ----------------
    status_text, color_code = calculate_delay_status(
        data.speed,
        data.traffic_level
    )

    # ---------------- ALLOCATION RULES (FINAL FIX) ----------------
    alerts = check_allocation_needs(
        bus_id=data.bus_id,
        route_id=data.route_id,
        passenger_count=data.passenger_count,
        capacity=data.capacity,
        speed=data.speed
    )

    # ---------------- SAVE TO DB (NON-BLOCKING) ----------------
    try:
        event = ETMEvent(
            bus_id=data.bus_id,
            route_id=int(data.route_id),
            lat=data.lat,
            lon=data.lon,
            speed=data.speed,
            traffic_level=data.traffic_level,
            passenger_count=data.passenger_count,
            timestamp=datetime.fromisoformat(data.timestamp)
        )
        db.add(event)
        db.commit()
    except Exception as e:
        print(f"⚠️ Database Warning (ignored): {e}")

    # ---------------- WEBSOCKET PAYLOAD ----------------
    payload = jsonable_encoder(data)
    payload.update({
        "status_text": status_text,
        "color": color_code,
        "alerts": alerts
    })

    # ---------------- BROADCAST ----------------
    background_tasks.add_task(manager.broadcast, payload)

    return {
        "status": "success",
        "bus_id": data.bus_id,
        "alerts": alerts
    }
