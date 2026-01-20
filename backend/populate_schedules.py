import random
from datetime import datetime, timedelta, time
from sqlalchemy import create_engine, text

# --- CONFIGURATION ---
DATABASE_URL = "postgresql://postgres:Manju%401234@localhost:5432/moovit_chalo"
engine = create_engine(DATABASE_URL)

def populate_schedules():
    print("📅 Starting Schedule Population...")

    with engine.connect() as conn:
        # 1. FETCH ACTUAL ROUTES FROM DB
        print("   Fetching existing routes...")
        routes = conn.execute(text("SELECT id, route_code, distance_km FROM routes WHERE is_active = true")).fetchall()
        
        if not routes:
            print("❌ No active routes found! Please run your route loader first.")
            return

        print(f"   Found {len(routes)} active routes.")

        # 2. CREATE/ENSURE BUSES EXIST
        # We will create a pool of 10 buses to assign to these routes
        bus_prefix = "KA-01-F-"
        buses = []
        for i in range(1001, 1011): # Buses 1001 to 1010
            bus_num = f"{bus_prefix}{i}"
            buses.append(bus_num)
            
            # Insert Bus if not exists
            conn.execute(text("""
                INSERT INTO buses (bus_number, capacity, condition, is_active)
                VALUES (:num, 40, 'Good', true)
                ON CONFLICT (bus_number) DO NOTHING
            """), {"num": bus_num})
        
        conn.commit()
        print("✅ Buses verified/created.")

        # 3. GENERATE SCHEDULES
        # Logic: Assign multiple buses to each route with 15-minute intervals
        print("   Generating schedules...")
        
        schedule_count = 0
        
        # Clear old schedules to avoid duplicates/clutter
        conn.execute(text("TRUNCATE TABLE schedules RESTART IDENTITY"))

        start_hour = 6  # Buses start at 6:00 AM
        end_hour = 22   # Buses end at 10:00 PM

        for route in routes:
            r_id = route.id
            r_code = route.route_code
            dist_km = route.distance_km if route.distance_km else 10.0 # Default if 0
            
            # Calculate approx travel time (assuming 20 km/h avg speed)
            travel_minutes = int((dist_km / 20) * 60) 
            
            # Assign a subset of buses to this route (randomly)
            route_buses = random.sample(buses, k=3) # 3 buses per route

            current_time = datetime.now().replace(hour=start_hour, minute=0, second=0, microsecond=0)
            end_time = current_time.replace(hour=end_hour)

            bus_idx = 0
            while current_time < end_time:
                # Pick a bus in round-robin fashion
                assigned_bus = route_buses[bus_idx % len(route_buses)]
                
                # Calculate Arrival Time
                departure_dt = current_time
                arrival_dt = departure_dt + timedelta(minutes=travel_minutes)

                # Insert into DB
                conn.execute(text("""
                    INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, day_type)
                    VALUES (:rid, :bid, :dep, :arr, 'Weekday')
                """), {
                    "rid": r_id,
                    "bid": assigned_bus,
                    "dep": departure_dt.time(),
                    "arr": arrival_dt.time()
                })

                schedule_count += 1
                bus_idx += 1
                
                # Next bus leaves in 20 minutes
                current_time += timedelta(minutes=20)

        conn.commit()
        print(f"✅ Successfully created {schedule_count} schedule entries.")

if __name__ == "__main__":
    populate_schedules()