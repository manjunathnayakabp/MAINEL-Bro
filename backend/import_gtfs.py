import pandas as pd
import math
import time
from sqlalchemy import create_engine, text
import os

# ⚠️ UPDATE YOUR NEON CONNECTION STRING HERE
# backend/import_gtfs.py

# ✅ UPDATED with your working connection string
DATABASE_URL = "postgresql://neondb_owner:npg_nWcM9iC5IaLZ@ep-still-grass-a1fpx0to.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

GTFS_PATH = "./gtfs_data" 

# Enable pre-ping to keep connection alive
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def haversine(lat1, lon1, lat2, lon2):
    """Calculates distance between two GPS points in KM"""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def batch_insert(conn, table, data, batch_size=200):
    """
    Inserts data in small chunks (200 rows) to prevent 
    'Server Closed Connection' errors.
    """
    total = len(data)
    if total == 0: return

    print(f"   Note: Inserting {total} rows into '{table}'...")
    
    for i in range(0, total, batch_size):
        batch = data[i:i + batch_size]
        
        try:
            if table == "stops":
                conn.execute(text("""
                    INSERT INTO stops (stop_id, stop_name, lat, lon) 
                    VALUES (:stop_id, :stop_name, :lat, :lon)
                    ON CONFLICT (stop_id) DO NOTHING
                """), batch)
            
            elif table == "route_stops":
                conn.execute(text("""
                    INSERT INTO route_stops (route_id, stop_id, sequence_number, distance_from_start_km)
                    VALUES (:rid, :sid, :seq, :d)
                """), batch)
                
            conn.commit() # Commit small chunk
            print(f"   ↳ {min(i + batch_size, total)} / {total} done")
            time.sleep(0.1) # Pause to let DB breathe
            
        except Exception as e:
            print(f"   ⚠️ Batch failed: {e}")
            conn.rollback()

def import_gtfs():
    print("🚀 Starting GTFS Import (Batched Mode)...")
    
    # 1. Verify Files Exist
    required_files = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt']
    for f in required_files:
        if not os.path.exists(f"{GTFS_PATH}/{f}"):
            print(f"❌ CRITICAL ERROR: Could not find '{f}' in '{GTFS_PATH}/'")
            print("   Please check if the folder is named 'gtfs' or 'gtfs_data'.")
            return

    conn = engine.connect()

    # 2. IMPORT STOPS
    print("\n📥 Processing Stops...")
    stops_df = pd.read_csv(f"{GTFS_PATH}/stops.txt")
    
    # Clean old data safely
    print("   Cleaning old tables...")
    conn.execute(text("TRUNCATE TABLE route_stops, routes, buses CASCADE"))
    conn.commit()

    stops_data = []
    for _, row in stops_df.iterrows():
        stops_data.append({
            "stop_id": str(row['stop_id']),
            "stop_name": str(row['stop_name']),
            "lat": float(row['stop_lat']),
            "lon": float(row['stop_lon'])
        })
    
    # Run the batch insert
    batch_insert(conn, "stops", stops_data)
    print("✅ Stops Imported.")

    # 3. IMPORT ROUTES (Top 50 Only for Speed)
    print("\n📥 Processing Routes...")
    routes_df = pd.read_csv(f"{GTFS_PATH}/routes.txt")
    trips_df = pd.read_csv(f"{GTFS_PATH}/trips.txt")
    stop_times_df = pd.read_csv(f"{GTFS_PATH}/stop_times.txt")

    # Filter unique routes
    unique_routes = trips_df.drop_duplicates(subset=['route_id']).head(50)
    
    route_stops_buffer = []

    for idx, (_, trip) in enumerate(unique_routes.iterrows()):
        route_id = trip['route_id']
        trip_id = trip['trip_id']
        
        # Get Route Name
        r_info = routes_df[routes_df['route_id'] == route_id]
        if r_info.empty: continue
        route_code = str(r_info.iloc[0].get('route_short_name', route_id))

        # Get Stops
        trip_stops = stop_times_df[stop_times_df['trip_id'] == trip_id].sort_values('stop_sequence')
        if trip_stops.empty: continue

        # Identify Source/Dest
        try:
            first_id = trip_stops.iloc[0]['stop_id']
            last_id = trip_stops.iloc[-1]['stop_id']
            src = stops_df[stops_df['stop_id'] == first_id].iloc[0]['stop_name']
            dst = stops_df[stops_df['stop_id'] == last_id].iloc[0]['stop_name']
        except:
            continue # Skip bad data

        # Calculate Distances
        total_dist = 0.0
        prev_lat, prev_lon = None, None
        current_stops = []

        for i, (_, st) in enumerate(trip_stops.iterrows()):
            try:
                s_id = st['stop_id']
                s_info = stops_df[stops_df['stop_id'] == s_id].iloc[0]
                
                if prev_lat is not None:
                    total_dist += haversine(prev_lat, prev_lon, s_info['stop_lat'], s_info['stop_lon'])
                
                prev_lat, prev_lon = s_info['stop_lat'], s_info['stop_lon']
                
                current_stops.append({
                    "sid": str(s_id),
                    "seq": i + 1,
                    "d": total_dist
                })
            except:
                pass

        # Insert Route
        res = conn.execute(text("""
            INSERT INTO routes (route_code, source, destination, distance_km, base_fare, is_active)
            VALUES (:code, :src, :dst, :dist, 25.0, true)
            RETURNING id
        """), { "code": route_code, "src": str(src), "dst": str(dst), "dist": total_dist })
        
        new_rid = res.fetchone()[0]
        conn.commit()

        # Add to buffer
        for rs in current_stops:
            rs['rid'] = new_rid
            route_stops_buffer.append(rs)

        print(f"   Processed Route {idx+1}: {route_code} ({src} -> {dst})")

    # Batch Insert Route Stops
    print("\n📥 Linking Stops to Routes...")
    batch_insert(conn, "route_stops", route_stops_buffer)

    # 4. CREATE BUSES
    print("\n🚌 Generating Buses...")
    conn.execute(text("TRUNCATE TABLE buses CASCADE"))
    conn.commit()
    for i in range(1, 31):
        conn.execute(text(f"INSERT INTO buses (bus_number, capacity, is_active, bus_status) VALUES ('KA-01-F-{2000+i}', 50, true, 'IDLE') ON CONFLICT DO NOTHING"))
    conn.commit()

    print("\n🎉 IMPORT COMPLETE!")

if __name__ == "__main__":
    import_gtfs()