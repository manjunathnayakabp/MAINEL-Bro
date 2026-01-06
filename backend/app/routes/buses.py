from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Bus
from app.schemas.bus import BusCreate

router = APIRouter(prefix="/buses", tags=["Buses"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def add_bus(bus: BusCreate, db: Session = Depends(get_db)):
    new_bus = Bus(**bus.dict())
    db.add(new_bus)
    db.commit()
    return {"message": "Bus added"}
