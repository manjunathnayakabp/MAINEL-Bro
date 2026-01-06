from sqlalchemy import Column, Integer, String
from app.database import Base

class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True)
    bus_number = Column(String, unique=True)
    capacity = Column(Integer)
    condition = Column(String, default="good")
