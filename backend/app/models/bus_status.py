from sqlalchemy import Column, Integer, Float, String
from app.database import Base

class BusStatus(Base):
    __tablename__ = "bus_status"

    id = Column(Integer, primary_key=True)
    bus_id = Column(String)
    current_stop = Column(String)
    delay_seconds = Column(Integer)
    eta_next_stop = Column(Float)
