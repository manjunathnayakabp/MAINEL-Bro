import pandas as pd
from sqlalchemy import create_engine, text
import os

# --- CONFIGURATION ---
# Ensure the password and DB name are correct
DATABASE_URL = "postgresql://postgres:Manju%401234@localhost:5432/moovit_chalo"
GTFS_FOLDER = "gtfs_data"  # Folder containing stops.txt, routes.txt, etc.

# Connect to Database
engine = create_engine(DATABASE_URL)

def load_gtfs():
    print("🚀 Starting GTFS Data Load...")
    
    # 1. READ GTFS FILES
    try:
        stops_df = pd.read_csv(os.path.join(GTFS_FOLDER, "stops.txt"))
        routes_df = pd.read_csv(os.path.join(GTFS_FOLDER, "routes.txt"))
        trips_df = pd.read_csv(os.path.join(GTFS_FOLDER, "trips.txt"))
        stop_times_df = pd.read_csv(os.path.join(GTFS_FOLDER, "stop_times.txt"))
    except FileNotFoundError as e:
        print(f"❌ Error: Could not find GTFS files. {e}")
        return

    with engine.connect() as conn:
        # --- 2. LOAD STOPS ---
        print(f"🚏 Loading {len(stops_df)} Stops...")
        
        # Rename columns to match your DB schema
        stops_data = stops_df[['stop_id', 'stop_name', 'stop_lat', 'stop_lon']].copy()
        stops_data.columns = ['stop_id', 'stop_name', 'lat', 'lon']
        
        for _, row in stops_data.iterrows():
            stmt = text("""
                INSERT INTO stops (stop_id, stop_name, lat, lon)
                VALUES (:id, :name, :lat, :lon)
                ON CONFLICT (stop_id) DO NOTHING
            """)
            conn.execute(stmt, {
                "id": str(row['stop_id']), 
                "name": row['stop_name'], 
                "lat": row['lat'], 
                "lon": row['lon']
            })
        conn.commit()
        print("✅ Stops Loaded.")


        # --- 3. LOAD ROUTES ---
        print(f"🛣️ Loading {len(routes_df)} Routes...")
        
        gtfs_to_db_route_map = {}

        for _, row in routes_df.iterrows():
            long_name = str(row.get('route_long_name', 'Unknown - Unknown'))
            parts = long_name.split(' - ')
            source = parts[0] if len(parts) > 0 else "Start"
            dest = parts[1] if len(parts) > 1 else "End"

            # FIX APPLIED HERE: [:20] truncates the name to fit the database
            route_code_raw = str(row.get('route_short_name', 'BUS'))
            route_code_safe = route_code_raw[:20] 

            stmt = text("""
                INSERT INTO routes (route_code, source, destination, distance_km, base_fare, is_active)
                VALUES (:code, :src, :dst, :dist, :fare, :active)
                ON CONFLICT DO NOTHING
                RETURNING id
            """)
            result = conn.execute(stmt, {
                "code": route_code_safe, 
                "src": source,
                "dst": dest,
                "dist": 0.0,
                "fare": 10.0,
                "active": True
            })
            
            new_id = result.scalar()
            if new_id:
                gtfs_to_db_route_map[str(row['route_id'])] = new_id
        
        conn.commit()
        print("✅ Routes Loaded.")


        # --- 4. LOAD ROUTE STOPS ---
        print("🔗 Linking Stops to Routes...")
        
        count = 0
        for gtfs_route_id, db_route_id in gtfs_to_db_route_map.items():
            
            # Find trips for this route
            # Ensure we compare strings to strings
            route_trips = trips_df[trips_df['route_id'].astype(str) == str(gtfs_route_id)]
            
            if route_trips.empty:
                continue 

            # Pick the first trip as the "representative" path
            representative_trip_id = route_trips.iloc[0]['trip_id']

            # Get stops for this trip
            trip_stops = stop_times_df[stop_times_df['trip_id'] == representative_trip_id]
            trip_stops = trip_stops.sort_values(by='stop_sequence')

            for _, stop_row in trip_stops.iterrows():
                stmt = text("""
                    INSERT INTO route_stops (route_id, stop_id, sequence_number, distance_from_start_km)
                    VALUES (:rid, :sid, :seq, :dist)
                """)
                try:
                    conn.execute(stmt, {
                        "rid": db_route_id,
                        "sid": str(stop_row['stop_id']),
                        "seq": int(stop_row['stop_sequence']),
                        "dist": 0.0 
                    })
                    count += 1
                except Exception:
                    pass # Ignore duplicates or errors silently to keep moving
        
        conn.commit()
        print(f"✅ Route Stops Loaded: {count} links created.")

if __name__ == "__main__":
    load_gtfs()