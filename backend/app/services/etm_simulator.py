import time
import requests
import random
from datetime import datetime
from sqlalchemy import create_engine, text

# ---------------- CONFIGURATION ----------------
API_URL = "http://127.0.0.1:8000/buses/update-location"
DATABASE_URL = "postgresql://postgres:Manju%401234@localhost:5432/moovit_chalo"

BUS_ID = "KA-01-F-1234"
ROUTE_ID = 1
BUS_CAPACITY = 50

SPEED_FACTOR = 5          # Higher = Faster simulation
INTERPOLATION_STEPS = 10  # Smoother movement
REQUEST_TIMEOUT = 3
# ----------------------------------------------


def get_route_path():
    """Fetch ordered stop coordinates for a route."""
    try:
        engine = create_engine(DATABASE_URL)
        query = text("""
            SELECT s.stop_name, s.lat, s.lon
            FROM route_stops rs
            JOIN stops s ON rs.stop_id = s.stop_id
            WHERE rs.route_id = :route_id
            ORDER BY rs.sequence_number
        """)

        with engine.connect() as connection:
            return connection.execute(
                query, {"route_id": ROUTE_ID}
            ).fetchall()

    except Exception as e:
        print(f"❌ Database Error: {e}")
        return []


def calculate_speed(traffic_level: int) -> float:
    """Determine speed based on traffic."""
    if traffic_level > 80:
        return 5.0     # Traffic Jam
    elif traffic_level > 50:
        return 20.0    # Moderate Traffic
    return 40.0        # Clear Road


def simulate():
    print(f"🔄 Fetching route {ROUTE_ID} from database...")
    stops = get_route_path()

    if not stops:
        print("❌ No stops found. Check DB & Route ID.")
        return

    print(f"✅ Route loaded with {len(stops)} stops")
    print(f"📍 Start: {stops[0][0]}")
    print(f"🏁 End:   {stops[-1][0]}")
    print(f"🚌 Bus ID: {BUS_ID}")
    print("-" * 55)

    while True:
        for i in range(len(stops) - 1):
            start_name, start_lat, start_lon = stops[i]
            end_name, end_lat, end_lon = stops[i + 1]

            print(f"\n🚦 Departed {start_name} ➜ {end_name}")

            for step in range(INTERPOLATION_STEPS + 1):

                # ---------------- TRAFFIC ----------------
                traffic_level = random.randint(0, 100)
                current_speed = calculate_speed(traffic_level)

                # ---------------- CROWD SIMULATION ----------------
                # Random passengers boarding / leaving
                passenger_count = random.randint(10, 60)

                # ---------------- POSITION ----------------
                ratio = step / INTERPOLATION_STEPS
                current_lat = start_lat + (end_lat - start_lat) * ratio
                current_lon = start_lon + (end_lon - start_lon) * ratio

                # ---------------- PAYLOAD ----------------
                payload = {
                    "bus_id": BUS_ID,
                    "route_id": str(ROUTE_ID),
                    "lat": current_lat,
                    "lon": current_lon,
                    "speed": current_speed,
                    "traffic_level": traffic_level,
                    "passenger_count": passenger_count,
                    "capacity": BUS_CAPACITY,
                    "timestamp": datetime.now().isoformat()
                }

                try:
                    response = requests.post(
                        API_URL,
                        json=payload,
                        timeout=REQUEST_TIMEOUT
                    )

                    status_icon = "✅" if response.status_code == 200 else "❌"
                    crowd_status = (
                        "FULL 🚨"
                        if passenger_count > BUS_CAPACITY
                        else "OK"
                    )

                    print(
                        f"\r{status_icon} "
                        f"Traffic: {traffic_level:3d}% | "
                        f"Speed: {current_speed:4.1f} km/h | "
                        f"Passengers: {passenger_count:2d}/{BUS_CAPACITY} "
                        f"({crowd_status}) | "
                        f"Server: {response.status_code}",
                        end=""
                    )

                except requests.exceptions.RequestException as e:
                    print(f"\n⚠️ API Error: {e}")
                    time.sleep(2)

                # ---------------- TIME DELAY ----------------
                time.sleep(2 / SPEED_FACTOR)

        print("\n\n🏁 Route completed. Restarting in 5 seconds...\n")
        time.sleep(5)


if __name__ == "__main__":
    simulate()
