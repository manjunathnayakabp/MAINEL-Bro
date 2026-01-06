from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String, unique=True, index=True) # e.g., "101E"
    source = Column(String)
    destination = Column(String)
    distance_km = Column(Float)
    base_fare = Column(Float)
    is_active = Column(Boolean, default=True)

    # Relationships
    schedules = relationship("Schedule", back_populates="route")