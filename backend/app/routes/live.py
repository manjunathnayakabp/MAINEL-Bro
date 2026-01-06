from fastapi import APIRouter
from app.database import SessionLocal
from app.models import ETMEvent

router = APIRouter(prefix="/live", tags=["Live Tracking"])

@router.get("/bus/{bus_id}")
def get_live_location(bus_id: str):
    db = SessionLocal()
    event = db.query(ETMEvent)\
              .filter(ETMEvent.bus_id == bus_id)\
              .order_by(ETMEvent.timestamp.desc())\
              .first()
    db.close()

    return event
