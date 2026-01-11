from fastapi import FastAPI
from app.database import engine, Base
from app.models import User  # IMPORTANT: forces model load
from app.routes import auth
from app.routes import admin
from app.routes import routes 
from app.routes import buses
from app.routes import schedules
from app.routes import journey 
from app.routes import tracking

app = FastAPI(
    title="MOOVIT-CHALO Intelligent Transport System",
    version="1.0"
)

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"status": "Backend running successfully"}
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(routes.router)
app.include_router(buses.router)
app.include_router(schedules.router)
app.include_router(journey.router)
app.include_router(tracking.router)