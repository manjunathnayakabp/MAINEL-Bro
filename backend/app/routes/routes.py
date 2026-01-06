from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Route
from app.schemas.route import RouteCreate

router = APIRouter(prefix="/routes", tags=["Routes"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_route(route: RouteCreate, db: Session = Depends(get_db)):
    new_route = Route(**route.dict())
    db.add(new_route)
    db.commit()
    return {"message": "Route created"}
