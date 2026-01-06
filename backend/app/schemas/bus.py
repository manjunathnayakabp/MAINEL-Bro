from pydantic import BaseModel

class BusCreate(BaseModel):
    bus_number: str
    capacity: int
    condition: str = "good"
