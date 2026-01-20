from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
import math

router = APIRouter(prefix="/trip", tags=["Trip Planner"])

# =====================================================
# Helper: Haversine Distance (KM)
# =====================================================
def calculate_distance(lat1, lon1, lat2, lon2):
    try:
        R = 6371  # Earth radius in km
        dlat = math.radians(float(lat2) - float(lat1))
        dlon = math.radians(float(lon2) - float(lon1))
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(float(lat1)))
            * math.cos(math.radians(float(lat2)))
            * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except:
        return 9999.0

# =====================================================
# 1. AUTOCOMPLETE STOPS
# =====================================================
@router.get("/search-stops")
def search_stops(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return []

    results = db.execute(text("""
        SELECT stop_id, stop_name, lat, lon
        FROM stops
        WHERE stop_name ILIKE :q
        LIMIT 5
    """), {"q": f"%{q}%"}).fetchall()

    return [
        {"id": r[0], "name": r[1], "lat": r[2], "lon": r[3]}
        for r in results
    ]

# =====================================================
# 2. PLAN TRIP (FIXED FOR RETURN TRIPS)
# =====================================================
@router.get("/plan")
def plan_trip(
    start_lat: float,
    start_lon: float,
    dest_stop_id: str,
    db: Session = Depends(get_db)
):
    print(f"🔎 SEARCHING: {start_lat},{start_lon} -> {dest_stop_id}")

    # -------------------------------------------------
    # STEP 1: FIND NEARBY START STOPS (DEEP SEARCH)
    # -------------------------------------------------
    all_stops = db.execute(
        text("SELECT stop_id, stop_name, lat, lon FROM stops")
    ).fetchall()

    nearby_starts = []
    SEARCH_RADIUS_KM = 5.0  # Wide radius to ensure connections

    for s in all_stops:
        dist = calculate_distance(start_lat, start_lon, s.lat, s.lon)
        if dist <= SEARCH_RADIUS_KM:
            nearby_starts.append({"stop": s, "dist": dist})
    
    nearby_starts.sort(key=lambda x: x["dist"])
    nearby_starts = nearby_starts[:5] # Check top 5 closest stops

    if not nearby_starts:
        raise HTTPException(
            status_code=404,
            detail=f"No bus stops found within {SEARCH_RADIUS_KM} km."
        )

    # -------------------------------------------------
    # STEP 2: FETCH DESTINATION STOP
    # -------------------------------------------------
    dest_stop = db.execute(
        text("SELECT stop_id, stop_name FROM stops WHERE stop_id = :id"),
        {"id": dest_stop_id}
    ).fetchone()

    if not dest_stop:
        raise HTTPException(status_code=404, detail="Destination stop not found")

    solutions = []
    seen_routes = set()

    # -------------------------------------------------
    # STEP 3: SEARCH LOGIC
    # -------------------------------------------------
    for entry in nearby_starts:
        start_node = entry["stop"]
        walking_dist = entry["dist"]
        
        # Helper: Get all routes
        def get_routes(stop_id):
            return db.execute(text("""
                SELECT r.id, r.route_code, rs.sequence_number
                FROM route_stops rs
                JOIN routes r ON rs.route_id = r.id
                WHERE rs.stop_id = :sid
            """), {"sid": stop_id}).fetchall()

        start_routes = get_routes(start_node.stop_id)
        end_routes = get_routes(dest_stop.stop_id)

        # Maps
        s_map = {r[0]: {"code": r[1], "seq": r[2]} for r in start_routes}
        e_map = {r[0]: {"code": r[1], "seq": r[2]} for r in end_routes}

        # --- STRATEGY A: DIRECT ROUTES ---
        common_ids = set(s_map.keys()) & set(e_map.keys())
        
        for rid in common_ids:
            if rid in seen_routes: continue

            # --- THE FIX IS HERE ---
            # We check if it is Forward OR Reverse. 
            # In a real app, reverse needs a separate DB entry. 
            # For this demo, we assume the bus drives back the same way.
            
            s_seq = s_map[rid]["seq"]
            e_seq = e_map[rid]["seq"]
            
            is_forward = s_seq < e_seq
            
            # Label it so the user knows
            route_type = "DIRECT" if is_forward else "DIRECT (Return Trip)"
            
            seen_routes.add(rid)
            solutions.append({
                "type": route_type,
                "total_stops": abs(e_seq - s_seq),
                "segments": [
                    {"mode": "WALK", "instruction": f"Walk {int(walking_dist*1000)}m to {start_node.stop_name}"},
                    {"mode": "BUS", "instruction": f"Take Bus {s_map[rid]['code']} to {dest_stop.stop_name}"},
                    {"mode": "WALK", "instruction": "You have arrived"}
                ]
            })

        # --- STRATEGY B: 1-TRANSFER ROUTES ---
        if len(solutions) < 3:
            for s_rid, s_info in s_map.items():
                for e_rid, e_info in e_map.items():
                    if s_rid == e_rid: continue 

                    # Find any intersection
                    transfer_stops = db.execute(text("""
                        SELECT s.stop_name, rs1.sequence_number, rs2.sequence_number
                        FROM route_stops rs1
                        JOIN route_stops rs2 ON rs1.stop_id = rs2.stop_id
                        JOIN stops s ON rs1.stop_id = s.stop_id
                        WHERE rs1.route_id = :r1 AND rs2.route_id = :r2
                    """), {"r1": s_rid, "r2": e_rid}).fetchall()

                    for t in transfer_stops:
                        t_name, t_seq1, t_seq2 = t

                        # Relaxed Validation: 
                        # We just want to ensure we don't transfer at the start or end node itself
                        if t_name != start_node.stop_name and t_name != dest_stop.stop_name:
                            
                            plan_key = f"{s_rid}-{e_rid}-{t_name}"
                            if plan_key not in seen_routes:
                                seen_routes.add(plan_key)
                                solutions.append({
                                    "type": "1-TRANSFER",
                                    "total_stops": 5, # Placeholder
                                    "segments": [
                                        {"mode": "WALK", "instruction": f"Walk {int(walking_dist*1000)}m to {start_node.stop_name}"},
                                        {"mode": "BUS", "instruction": f"Take Bus {s_info['code']} to {t_name}"},
                                        {"mode": "TRANSFER", "instruction": f"Switch at {t_name}"},
                                        {"mode": "BUS", "instruction": f"Take Bus {e_info['code']} to {dest_stop.stop_name}"}
                                    ]
                                })
                                break 
                if len(solutions) >= 5: break
            if len(solutions) >= 5: break

    # Final Check
    if not solutions:
        return {
            "start": start_node.stop_name,
            "destination": dest_stop.stop_name,
            "plans": [],
            "message": "No routes found."
        }

    # Sort: Direct first
    solutions.sort(key=lambda x: (0 if "DIRECT" in x["type"] else 1))

    return {
        "start": start_node.stop_name,
        "destination": dest_stop.stop_name,
        "plans": solutions
    }