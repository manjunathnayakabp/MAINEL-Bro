from sqlalchemy import Column, Integer, Time, ForeignKey, String
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    bus_id = Column(Integer, ForeignKey("buses.id"))
    departure_time = Column(Time)
    arrival_time = Column(Time)
    day_type = Column(String)  # weekday / weekend
