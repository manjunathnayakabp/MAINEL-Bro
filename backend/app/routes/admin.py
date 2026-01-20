from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from pydantic import BaseModel
from datetime import datetime
import random

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
# ADMIN AUTH (DEMO + REAL)
# =====================================================
def admin_required(token: str):
    # 🔓 DEMO BACKDOOR (for frontend testing)
    if token == DEMO_TOKEN:
        return {
            "role": "admin",
            "user": "Demo Admin",
            "mode": "demo"
        }

    # 🔒 REAL JWT SECURITY
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# =====================================================
# ADMIN DASHBOARD (AUTH CHECK)
# =====================================================
@router.get("/dashboard")
def admin_dashboard(token: str):
    admin_required(token)
    return {"message": "Welcome Admin"}


# =====================================================
# ADMIN FLEET STATS (REAL DB KPIs)
# =====================================================
@router.get("/fleet-stats")
def get_fleet_stats(
    token: str,
    db: Session = Depends(get_db)
):
    admin_required(token)

    total_buses = db.query(Bus).count()
    total_routes = db.query(Route).count()
    active_buses = db.query(ETMEvent.bus_id).distinct().count()

    return {
        "total_buses": total_buses,
        "total_routes": total_routes,
        "active_buses": active_buses,
        "system_health": "Good"
    }


# =====================================================
# ANALYTICS (CHART DATA FOR ADMIN DASHBOARD)
# =====================================================
@router.get("/analytics")
def get_analytics(token: str):
    admin_required(token)

    # 1. Delays per Hour (00 → 23)
    # Peaks around 9 AM & 6 PM
    delays_per_hour = [
        2, 1, 0, 0, 1, 5, 12, 25, 40, 30, 15, 10,
        10, 12, 15, 28, 45, 50, 35, 20, 10, 5, 3, 2
    ]

    # 2. Passenger Demand (Last 7 Days)
    passenger_trends = [450, 520, 480, 600, 750, 300, 250]
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return {
        "delays": delays_per_hour,
        "passengers": passenger_trends,
        "labels": days
    }


# =====================================================
# ALERT RESOLUTION (ADMIN ACTION)
# =====================================================
class AllocationRequest(BaseModel):
    bus_id: str
    route_id: str
    action_type: str  # DEPLOY_SPARE, REROUTE, HOLD


# In-memory audit log (replace with DB later)
action_logs = []


@router.post("/resolve-alert")
def resolve_alert(
    request: AllocationRequest,
    token: str
):
    admin = admin_required(token)

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "admin": admin.get("user", "ADMIN_USER"),
        "action": request.action_type,
        "bus_id": request.bus_id,
        "route_id": request.route_id,
        "status": "EXECUTED"
    }

    action_logs.append(log_entry)

    print(
        f"🔧 ADMIN ACTION: {request.action_type} | "
        f"Bus: {request.bus_id} | Route: {request.route_id}"
    )

    return {
        "message": f"Action '{request.action_type}' executed successfully",
        "log_id": len(action_logs)
    }


# =====================================================
# ACTION LOGS (AUDIT TRAIL)
# =====================================================
@router.get("/action-logs")
def get_action_logs(token: str):
    admin_required(token)
    return action_logs
