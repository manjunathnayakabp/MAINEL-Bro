from pydantic import BaseModel
from datetime import time

class ScheduleCreate(BaseModel):
    route_id: int
    bus_id: int
    departure_time: time
    arrival_time: time
    day_type: str
