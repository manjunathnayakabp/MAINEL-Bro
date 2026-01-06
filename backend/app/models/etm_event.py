from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base
from datetime import datetime

class ETMEvent(Base):
    __tablename__ = "etm_events"

    id = Column(Integer, primary_key=True)
    bus_id = Column(String)
    route_id = Column(String)
    stop_id = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    event_type = Column(String)   # ARRIVED, DEPARTED, IN_TRANSIT
    timestamp = Column(DateTime, default=datetime.utcnow)
    delay_minutes = Column(Integer, default=0)
