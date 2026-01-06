from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
# IMPORT THE DATABASE MODELS, NOT SCHEMAS
from app.models.route import Route 
from app.models.schedule import Schedule 

router = APIRouter(prefix="/journey", tags=["Journey"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/search")
def search_journey(source: str, destination: str, db: Session = Depends(get_db)):
    # 1. Find routes matching basic source/dest
    routes = db.query(Route).filter(
        Route.source.ilike(f"%{source}%"),      # Partial match (case-insensitive)
        Route.destination.ilike(f"%{destination}%"), # Partial match
        Route.is_active == True
    ).all()

    if not routes:
        return {"message": "No routes found", "results": []}

    results = []
    for route in routes:
        # 2. Find schedules for this route
        schedules = db.query(Schedule).filter(
            Schedule.route_id == route.id
        ).all()

        for s in schedules:
            # Simple fare calculation logic
            fare = route.base_fare + (route.distance_km * 2) 
            
            results.append({
                "route": route.route_code,
                "from": route.source,
                "to": route.destination,
                "bus_id": s.bus_id,
                "departure": s.departure_time,
                "arrival": s.arrival_time,
                "fare": round(fare, 2)
            })

    return {"count": len(results), "results": results}