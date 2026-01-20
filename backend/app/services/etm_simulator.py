import time
import requests
import random
import threading
from datetime import datetime
from sqlalchemy import create_engine, text

# =====================================================
# CONFIGURATION
# =====================================================
API_URL = "http://127.0.0.1:8000/buses/update-location"
DATABASE_URL = "postgresql://postgres:Manju%401234@localhost:5432/moovit_chalo"

BUS_CAPACITY = 50
SPEED_FACTOR = 2
INTERPOLATION_STEPS = 20

engine = create_engine(DATABASE_URL)

# =====================================================
# DB HELPERS
# =====================================================
def get_buses_for_simulation():
    """Fetch buses eligible for auto-simulation."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT bus_number 
            FROM buses 
            WHERE condition = 'Good'
        """))
        return [row[0] for row in result.fetchall()]


def get_active_routes():
    with engine.connect() as conn:
        try:
            result = conn.execute(
                text("SELECT id FROM routes WHERE is_active = true")
            )
        except:
            result = conn.execute(text("SELECT id FROM routes"))
        return [row[0] for row in result.fetchall()]


def check_if_manual(bus_id: str) -> bool:
    """Check if ETM has taken over the bus."""
    with engine.connect() as conn:
        return conn.execute(
            text("SELECT is_manual FROM buses WHERE bus_number = :bid"),
            {"bid": bus_id}
        ).scalar()


def get_route_path(route_id: int):
    """Fetch ordered stop coordinates."""
    query = text("""
        SELECT s.stop_name, s.lat, s.lon
        FROM route_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = :rid
        ORDER BY rs.sequence_number ASC
    """)
    with engine.connect() as conn:
        return [tuple(row) for row in conn.execute(query, {"rid": route_id}).fetchall()]


def calculate_speed(traffic_level: int) -> float:
    if traffic_level > 80:
        return 8.0      # Heavy traffic
    elif traffic_level > 50:
        return 20.0     # Moderate
    return 40.0         # Free flow


# =====================================================
# BUS SIMULATION THREAD
# =====================================================
def simulate_bus(bus_id: str, route_id: int):
    stops = get_route_path(route_id)
    if not stops or len(stops) < 2:
        print(f"❌ Bus {bus_id}: Invalid route {route_id}")
        return

    current_occupancy = 0
    direction = 1  # 1 = forward, -1 = reverse

    print(f"🚌 Simulator started | Bus {bus_id} | Route {route_id}")

    while True:
        stop_indices = range(len(stops) - 1)
        if direction == -1:
            stop_indices = reversed(range(1, len(stops)))

        for i in stop_indices:

            # ---------------- MANUAL OVERRIDE ----------------
            if check_if_manual(bus_id):
                print(f"⚠️ Bus {bus_id} switched to MANUAL. Simulator paused.")
                time.sleep(5)
                continue

            start = stops[i]
            end = stops[i + direction]

            # ---------------- PASSENGER LOGIC ----------------
            # Deboard up to 40%
            leaving = random.randint(0, int(current_occupancy * 0.4) + 1)
            current_occupancy = max(0, current_occupancy - leaving)

            # Board passengers
            boarding = random.randint(0, 15)
            boarding = min(boarding, BUS_CAPACITY - current_occupancy)
            current_occupancy += boarding

            # ---------------- TRAFFIC LOGIC ----------------
            traffic_level = random.randint(0, 100)
            speed = calculate_speed(traffic_level)

            # ---------------- MOVE BETWEEN STOPS ----------------
            for step in range(INTERPOLATION_STEPS + 1):
                if check_if_manual(bus_id):
                    break

                ratio = step / INTERPOLATION_STEPS
                lat = start[1] + (end[1] - start[1]) * ratio
                lon = start[2] + (end[2] - start[2]) * ratio

                payload = {
                    "bus_id": bus_id,
                    "route_id": str(route_id),
                    "lat": lat,
                    "lon": lon,
                    "speed": speed,
                    "traffic_level": traffic_level,
                    "passenger_count": current_occupancy,
                    "capacity": BUS_CAPACITY,
                    "timestamp": datetime.now().isoformat()
                }

                try:
                    requests.post(API_URL, json=payload, timeout=1)
                except:
                    pass

                time.sleep((1 / speed) * 10 / SPEED_FACTOR)

        # ---------------- END OF ROUTE ----------------
        print(f"🔄 Bus {bus_id} reached end of route. Turning around.")
        direction *= -1
        current_occupancy = 0
        time.sleep(3)


# =====================================================
# MAIN ENTRY
# =====================================================
def main():
    print("🚀 Starting Fleet Simulation...")

    buses = get_buses_for_simulation()
    routes = get_active_routes()

    if not buses or not routes:
        print("❌ No buses or routes found.")
        return

    print(f"✅ Loaded {len(buses)} buses | {len(routes)} routes")
    print("-" * 50)

    for i, bus_id in enumerate(buses):
        assigned_route = routes[i % len(routes)]
        t = threading.Thread(
            target=simulate_bus,
            args=(bus_id, assigned_route),
            daemon=True
        )
        t.start()
        time.sleep(1)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")


if __name__ == "__main__":
    main()
