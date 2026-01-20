from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.database import Base
from datetime import datetime

class ETMEvent(Base):
    __tablename__ = "etm_events"

    # -------------------------------------------------
    # Primary Key
    # -------------------------------------------------
    id = Column(Integer, primary_key=True, index=True)

    # -------------------------------------------------
    # Core Identifiers
    # -------------------------------------------------
    bus_id = Column(
        String,
        ForeignKey("buses.bus_number"),
        index=True,
        nullable=False
    )

    route_id = Column(
        Integer,
        ForeignKey("routes.id"),
        nullable=False
    )

    # -------------------------------------------------
    # Location Data (Matches Simulator)
    # -------------------------------------------------
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)

    # -------------------------------------------------
    # Movement & Traffic
    # -------------------------------------------------
    speed = Column(Float, nullable=False)
    traffic_level = Column(Integer, default=0)

    # -------------------------------------------------
    # Crowd Data (Admin Dashboard + Allocation Rules)
    # -------------------------------------------------
    passenger_count = Column(Integer, default=0)

    # -------------------------------------------------
    # Optional Stop / Event Metadata
    # -------------------------------------------------
    stop_id = Column(String, nullable=True)
    event_type = Column(String, nullable=True)  # ARRIVED / DEPARTED
    delay_minutes = Column(Integer, default=0)

    # -------------------------------------------------
    # Timestamp
    # -------------------------------------------------
    timestamp = Column(DateTime, default=datetime.utcnow)
