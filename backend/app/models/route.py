from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True)
    route_code = Column(String, unique=True, index=True)
    source = Column(String)
    destination = Column(String)
    distance_km = Column(Float)
    base_fare = Column(Float)
    is_active = Column(Boolean, default=True)
