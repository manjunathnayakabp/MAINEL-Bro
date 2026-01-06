from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Route, Schedule

router = APIRouter(prefix="/journey", tags=["Journey"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/search")
def search_journey(source: str, destination: str, db: Session = Depends(get_db)):
    routes = db.query(Route).filter(
        Route.source == source,
        Route.destination == destination,
        Route.is_active == True
    ).all()

    results = []
    for route in routes:
        schedules = db.query(Schedule).filter(
            Schedule.route_id == route.id
        ).all()

        for s in schedules:
            fare = route.base_fare + (route.distance_km * 1.5)
            
            results.append({
                "route_code": route.route_code,
                "bus_id": s.bus_id,
                "departure": s.departure_time,
                "arrival": s.arrival_time,
                "fare": fare
            })

    return results
