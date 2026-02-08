from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from jose import jwt, JWTError
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.bus import Bus
from app.models.route import Route
from app.models.etm_event import ETMEvent

router = APIRouter(prefix="/admin", tags=["Admin"])

# =====================================================
# JWT CONFIG
# =====================================================
SECRET_KEY = "SECRET_KEY_CHANGE_LATER"
ALGORITHM = "HS256"
DEMO_TOKEN = "mock_token_for_demo"

# =====================================================
# ADMIN AUTH
# =====================================================
def admin_required(token: str):
    # 🔓 Demo backdoor
    if token == DEMO_TOKEN:
        return {"role": "admin", "user": "Demo Admin", "mode": "demo"}

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# =====================================================
# DASHBOARD CHECK
# =====================================================
@router.get("/dashboard")
def admin_dashboard(token: str):
    admin_required(token)
    return {"message": "Welcome Admin"}


# =====================================================
# FLEET KPIs
# =====================================================
@router.get("/fleet-stats")
def get_fleet_stats(token: str, db: Session = Depends(get_db)):
    admin_required(token)

    return {
        "total_buses": db.query(Bus).count(),
        "total_routes": db.query(Route).count(),
        "active_buses": db.query(ETMEvent.bus_id).distinct().count(),
        "system_health": "Good"
    }


# =====================================================
# ANALYTICS (CHART DATA)
# =====================================================
@router.get("/analytics")
def get_analytics(token: str):
    admin_required(token)

    return {
        "delays": [
            2, 1, 0, 0, 1, 5, 12, 25, 40, 30, 15, 10,
            10, 12, 15, 28, 45, 50, 35, 20, 10, 5, 3, 2
        ],
        "passengers": [450, 520, 480, 600, 750, 300, 250],
        "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    }


# =====================================================
# ALLOCATION SYSTEM
# =====================================================
class AllocationRequest(BaseModel):
    route_id: int
    bus_id: str
    driver_id: int


# --- Crowded Routes (Demo logic) ---
@router.get("/crowded-routes")
def get_crowded_routes(db: Session = Depends(get_db)):
    return db.execute(text("""
        SELECT id, route_code, source, destination
        FROM routes
        WHERE is_active = true
        LIMIT 2
    """)).fetchall()


# --- Idle Buses & Drivers ---
@router.get("/idle-resources")
def get_idle_resources(db: Session = Depends(get_db)):
    buses = db.execute(text("""
        SELECT bus_number, capacity
        FROM buses
        WHERE (bus_status = 'IDLE' OR bus_status IS NULL)
          AND is_active = true
    """)).fetchall()

    drivers = db.execute(text("""
        SELECT id, name
        FROM users
        WHERE role = 'DRIVER'
          AND (driver_status = 'IDLE' OR driver_status IS NULL)
    """)).fetchall()

    return {
        "buses": [{"id": b[0], "capacity": b[1]} for b in buses],
        "drivers": [{"id": d[0], "name": d[1]} for d in drivers]
    }


# --- Allocate Bus & Driver ---
@router.post("/allocate")
def allocate_bus(req: AllocationRequest, db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE buses SET bus_status='ON_ROUTE' WHERE bus_number=:b"),
        {"b": req.bus_id}
    )

    db.execute(
        text("UPDATE users SET driver_status='ON_DUTY' WHERE id=:d"),
        {"d": req.driver_id}
    )

    route_code = db.execute(
        text("SELECT route_code FROM routes WHERE id=:r"),
        {"r": req.route_id}
    ).scalar()

    message = (
        f"URGENT: Assigned to Route {route_code} "
        f"with Bus {req.bus_id}. Start immediately."
    )

    db.execute(text("""
        INSERT INTO notifications (user_id, message, created_at)
        VALUES (:u, :m, NOW())
    """), {"u": req.driver_id, "m": message})

    db.commit()
    return {"status": "Allocated", "message": "Driver notified"}


# =====================================================
# ALERT RESOLUTION (ADMIN ACTIONS)
# =====================================================
class ResolveAlertRequest(BaseModel):
    bus_id: str
    route_id: str
    action_type: str  # DEPLOY_SPARE | REROUTE | HOLD


action_logs = []


@router.post("/resolve-alert")
def resolve_alert(req: ResolveAlertRequest, token: str):
    admin = admin_required(token)

    log = {
        "timestamp": datetime.now().isoformat(),
        "admin": admin.get("user"),
        "action": req.action_type,
        "bus_id": req.bus_id,
        "route_id": req.route_id,
        "status": "EXECUTED"
    }
    action_logs.append(log)

    return {
        "message": f"Action '{req.action_type}' executed",
        "log_id": len(action_logs)
    }


# =====================================================
# AUDIT LOGS
# =====================================================
@router.get("/action-logs")
def get_action_logs(token: str):
    admin_required(token)
    return action_logs


# =====================================================
# DRIVER NOTIFICATIONS
# =====================================================
@router.get("/notifications/{user_id}")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    results = db.execute(text("""
        SELECT message, created_at FROM notifications 
        WHERE user_id = :u AND is_read = false 
        ORDER BY created_at DESC
    """), {"u": user_id}).fetchall()
    
    # FIX: Convert the "Row" objects to a simple list of [message, timestamp]
    return [[row[0], row[1]] for row in results]
