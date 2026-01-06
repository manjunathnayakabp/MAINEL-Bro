from sqlalchemy import Column, Integer, String
from app.database import Base

class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True)
    route_id = Column(String)
    stop_id = Column(String)
    stop_sequence = Column(Integer)
