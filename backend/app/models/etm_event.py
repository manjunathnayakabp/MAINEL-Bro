from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.database import Base
from datetime import datetime

class ETMEvent(Base):
    __tablename__ = "etm_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # 1. Match the Simulator Data (lat, lon)
    bus_id = Column(String, ForeignKey("buses.bus_number")) 
    route_id = Column(Integer, ForeignKey("routes.id"))
    
    # 2. Use 'lat' and 'lon' (Not latitude/longitude)
    lat = Column(Float)
    lon = Column(Float)
    
    speed = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # 3. Optional fields (Make them nullable so they don't crash if missing)
    stop_id = Column(String, nullable=True)
    event_type = Column(String, nullable=True) # ARRIVED, DEPARTED
    delay_minutes = Column(Integer, default=0)