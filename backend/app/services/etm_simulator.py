import time
import requests
import sys
import os
from datetime import datetime
from sqlalchemy import create_engine, text

# --- CONFIGURATION ---
API_URL = "http://127.0.0.1:8000/buses/update-location"
DATABASE_URL = "postgresql://postgres:Manju%401234@localhost:5432/moovit_chalo"
BUS_ID = "KA-01-F-1234"
ROUTE_ID = 1      # Must match a route ID in your 'routes' table
SPEED_FACTOR = 5  # Higher = Faster simulation (5x real speed)

def get_route_path():
    """Fetches the ordered list of stop coordinates for the route from the DB."""
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    
    # Query: Join route_stops and stops to get lat/lon in sequence
    query = text("""
        SELECT s.stop_name, s.lat, s.lon 
        FROM route_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = :route_id
        ORDER BY rs.sequence_number
    """)
    
    result = connection.execute(query, {"route_id": ROUTE_ID}).fetchall()
    connection.close()
    return result

def simulate():
    print(f"🔄 Connecting to DB to fetch path for Route {ROUTE_ID}...")
    stops = get_route_path()
    
    if not stops:
        print("❌ Error: No stops found for this Route ID. Did you run the SQL script?")
        return

    print(f"✅ Route loaded: {len(stops)} stops found.")
    print(f"   Start: {stops[0][0]}")
    print(f"   End:   {stops[-1][0]}")
    print(f"🚌 Starting Bus {BUS_ID}...")

    while True:
        # Loop through each segment (Stop A -> Stop B)
        for i in range(len(stops) - 1):
            start_node = stops[i]
            end_node = stops[i+1]
            
            start_name, start_lat, start_lon = start_node
            end_name, end_lat, end_lon = end_node

            print(f"\n🚦 Departed: {start_name} --> Heading to: {end_name}")

            # Interpolate: Create 10 intermediate points between stops
            steps = 10
            for step in range(steps + 1):
                # Linear Interpolation formula
                ratio = step / steps
                current_lat = start_lat + (end_lat - start_lat) * ratio
                current_lon = start_lon + (end_lon - start_lon) * ratio

                payload = {
                    "bus_id": BUS_ID,
                    "route_id": str(ROUTE_ID),
                    "lat": current_lat,
                    "lon": current_lon,
                    "speed": 40.0, # Simulated speed
                    "timestamp": datetime.now().isoformat()
                }

                try:
                    # SEND DATA TO SERVER
                    response = requests.post(API_URL, json=payload)
                    
                    # LOGGING
                    status = "✅" if response.status_code == 200 else "❌"
                    print(f"\r{status} GPS: {current_lat:.5f}, {current_lon:.5f} | Server: {response.status_code}", end="")
                    
                except requests.exceptions.ConnectionError:
                    print("\n⚠️ Connection Error: Is the FastAPI server running?")
                    time.sleep(2)

                time.sleep(2 / SPEED_FACTOR) # Delay between updates

        print("\n🏁 Reached Destination. Turning around in 5s...")
        time.sleep(5)
        # Optional: Reverse the stops list to drive back
        # stops.reverse() 

if __name__ == "__main__":
    simulate()