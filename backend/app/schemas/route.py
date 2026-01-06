from pydantic import BaseModel

class RouteCreate(BaseModel):
    route_code: str
    source: str
    destination: str
    distance_km: float
    base_fare: float
