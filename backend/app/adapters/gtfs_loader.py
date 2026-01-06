import pandas as pd
from app.database import SessionLocal
from app.models import Stop, RouteStop

def load_gtfs(path: str):
    db = SessionLocal()

    stops = pd.read_csv(f"{path}/stops.txt")
    for _, row in stops.iterrows():
        db.merge(Stop(
            stop_id=str(row["stop_id"]),
            stop_name=row["stop_name"],
            lat=row["stop_lat"],
            lon=row["stop_lon"]
        ))

    db.commit()
    db.close()
