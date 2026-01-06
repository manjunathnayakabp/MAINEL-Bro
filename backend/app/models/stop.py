from sqlalchemy import Column, String, Float
from app.database import Base

class Stop(Base):
    __tablename__ = "stops"  # Must match SQL table name

    stop_id = Column(String, primary_key=True) # Matches SQL VARCHAR
    stop_name = Column(String)
    lat = Column(Float)  # Matches SQL DOUBLE PRECISION
    lon = Column(Float)