from sqlalchemy import Column, String, Float
from app.database import Base

class Stop(Base):
    __tablename__ = "stops"

    stop_id = Column(String, primary_key=True)
    stop_name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
