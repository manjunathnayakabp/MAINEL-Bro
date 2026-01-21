from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import User  # IMPORTANT: forces model loading

# Routers
from app.routes import auth
from app.routes import admin
from app.routes import routes
from app.routes import buses
from app.routes import schedules
from app.routes import journey
from app.routes import tracking
from app.routes import etm
from app.routes import trip_planner


# --------------------------------------------------
# App Initialization
# --------------------------------------------------
app = FastAPI(
    title="BUS KAR BAHI  Intelligent Transport System",
    version="1.0"
)

# --------------------------------------------------
# CORS Middleware (Frontend ↔ Backend)
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # 🔧 Use specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Database Initialization
# --------------------------------------------------
Base.metadata.create_all(bind=engine)

# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------
@app.get("/")
def root():
    return {"status": "Backend running successfully"}

# --------------------------------------------------
# Register Routers
# --------------------------------------------------
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(routes.router)
app.include_router(buses.router)
app.include_router(schedules.router)
app.include_router(journey.router)
app.include_router(tracking.router)
app.include_router(etm.router)
app.include_router(trip_planner.router)