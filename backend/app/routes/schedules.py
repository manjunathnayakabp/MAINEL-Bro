from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Schedule
from app.schemas.schedule import ScheduleCreate

router = APIRouter(prefix="/schedules", tags=["Schedules"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db)):
    new_schedule = Schedule(**schedule.dict())
    db.add(new_schedule)
    db.commit()
    return {"message": "Schedule created"}
