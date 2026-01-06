from sqlalchemy import Column, Integer, Time, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    bus_id = Column(String) # For now keeping simple, later link to Bus table
    departure_time = Column(Time)
    arrival_time = Column(Time)
    day_type = Column(String, default="weekday") # weekday, weekend

    # Relationships
    route = relationship("Route", back_populates="schedules")