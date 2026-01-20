from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.database import get_db
from app.websocket.manager import manager

router = APIRouter(prefix="/etm", tags=["ETM Manual Control"])

# =====================================================
# SCHEMAS
# =====================================================
class MoveRequest(BaseModel):
    bus_id: str
    route_id: int


class TicketRequest(BaseModel):
    bus_id: str
    route_id: int
    source_stop: str | None = None
    dest_stop: str
    count: int


# =====================================================
# 1. CONFIG: BUSES & ROUTES
# =====================================================
@router.get("/config")
def get_etm_config(db: Session = Depends(get_db)):
    buses = db.execute(
        text("SELECT bus_number FROM buses WHERE is_active = true")
    ).fetchall()

    routes = db.execute(text("""
        SELECT id, route_code, source, destination 
        FROM routes 
        WHERE is_active = true
    """)).fetchall()

    return {
        "buses": [b[0] for b in buses],
        "routes": [
            {"id": r[0], "name": f"{r[1]}: {r[2]} → {r[3]}"}
            for r in routes
        ]
    }


@router.get("/routes/{route_id}/stops")
def get_route_stops(route_id: int, db: Session = Depends(get_db)):
    stops = db.execute(text("""
        SELECT s.stop_id, s.stop_name
        FROM route_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = :rid
        ORDER BY rs.sequence_number ASC
    """), {"rid": route_id}).fetchall()

    return [{"id": s[0], "name": s[1]} for s in stops]


# =====================================================
# 2. START TRIP (CLAIM BUS)
# =====================================================
@router.post("/start")
def start_trip(data: MoveRequest, db: Session = Depends(get_db)):
    # Claim bus + reset occupancy + snap to first stop
    db.execute(text("""
        UPDATE buses
        SET is_manual = TRUE,
            current_occupancy = 0,
            current_stop_id = (
                SELECT stop_id 
                FROM route_stops 
                WHERE route_id = :rid AND sequence_number = 1
            )
        WHERE bus_number = :bid
    """), {"rid": data.route_id, "bid": data.bus_id})

    # Clear old tickets
    db.execute(text("DELETE FROM tickets WHERE bus_id = :bid"), {"bid": data.bus_id})

    db.commit()

    return {
        "status": "Trip Started",
        "mode": "MANUAL",
        "bus_id": data.bus_id,
        "route_id": data.route_id,
        "occupancy": 0
    }


# =====================================================
# 3. END TRIP (RELEASE BUS)
# =====================================================
@router.post("/end")
def end_trip(data: MoveRequest, db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE buses SET is_manual = FALSE WHERE bus_number = :bid"),
        {"bid": data.bus_id}
    )
    db.commit()

    return {
        "status": "Trip Ended",
        "mode": "AUTO",
        "bus_id": data.bus_id
    }


# =====================================================
# 4. ISSUE TICKET (BOARDING)
# =====================================================
@router.post("/issue-ticket")
def issue_ticket(ticket: TicketRequest, db: Session = Depends(get_db)):
    db.execute(text("""
        INSERT INTO tickets 
        (bus_id, route_id, source_stop, dest_stop, ticket_count, status)
        VALUES (:bid, :rid, :src, :dst, :cnt, 'ACTIVE')
    """), {
        "bid": ticket.bus_id,
        "rid": ticket.route_id,
        "src": ticket.source_stop,
        "dst": ticket.dest_stop,
        "cnt": ticket.count
    })

    db.execute(text("""
        UPDATE buses
        SET current_occupancy = current_occupancy + :cnt
        WHERE bus_number = :bid
    """), {"cnt": ticket.count, "bid": ticket.bus_id})

    db.commit()

    return {
        "status": "Ticket Issued",
        "added": ticket.count
    }


# =====================================================
# 5. MOVE TO NEXT STOP (DEBOARD + BROADCAST)
# =====================================================
@router.post("/move-next")
async def move_next(
    data: MoveRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Current stop sequence
    curr = db.execute(text("""
        SELECT rs.sequence_number
        FROM buses b
        JOIN route_stops rs ON b.current_stop_id = rs.stop_id
        WHERE b.bus_number = :bid AND rs.route_id = :rid
    """), {"bid": data.bus_id, "rid": data.route_id}).fetchone()

    current_seq = curr[0] if curr else 0

    # Next stop
    next_stop = db.execute(text("""
        SELECT s.stop_id, s.stop_name, s.lat, s.lon
        FROM route_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = :rid AND rs.sequence_number = :seq
    """), {"rid": data.route_id, "seq": current_seq + 1}).fetchone()

    if not next_stop:
        return {"status": "End of Route"}

    stop_id, stop_name, lat, lon = next_stop

    # Deboard passengers
    deboard = db.execute(text("""
        SELECT COALESCE(SUM(ticket_count), 0)
        FROM tickets
        WHERE bus_id = :bid AND dest_stop = :sid AND status = 'ACTIVE'
    """), {"bid": data.bus_id, "sid": stop_id}).scalar()

    # Update bus
    db.execute(text("""
        UPDATE buses
        SET current_stop_id = :sid,
            current_occupancy = GREATEST(0, current_occupancy - :deboard)
        WHERE bus_number = :bid
    """), {"sid": stop_id, "deboard": deboard, "bid": data.bus_id})

    # Close tickets
    db.execute(text("""
        UPDATE tickets
        SET status = 'COMPLETED'
        WHERE bus_id = :bid AND dest_stop = :sid
    """), {"bid": data.bus_id, "sid": stop_id})

    db.commit()

    # Fetch occupancy
    occupancy = db.execute(
        text("SELECT current_occupancy FROM buses WHERE bus_number = :bid"),
        {"bid": data.bus_id}
    ).scalar()

    # Broadcast to map
    payload = {
        "bus_id": data.bus_id,
        "route_id": str(data.route_id),
        "lat": lat,
        "lon": lon,
        "speed": 0,
        "traffic_level": 0,
        "passenger_count": occupancy,
        "status_text": f"At {stop_name}",
        "color": "blue"  # Manual buses
    }

    background_tasks.add_task(manager.broadcast, payload)

    return {
        "status": "Moved",
        "current_stop": stop_name,
        "deboarded": deboard,
        "occupancy": occupancy
    }
