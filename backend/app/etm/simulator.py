import random
from datetime import datetime, timedelta

def simulate_etm(route_stops):
    events = []
    current_time = datetime.now()
    delay = 0

    for stop in route_stops:
        dwell = random.randint(30, 90)
        delay += random.choice([0, 1])

        events.append({
            "stop_id": stop.stop_id,
            "event_type": "ARRIVED",
            "actual_time": current_time.time(),
            "delay": delay
        })

        current_time += timedelta(seconds=dwell)

    return events
