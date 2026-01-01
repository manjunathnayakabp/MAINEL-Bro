from fastapi import FastAPI
from app.database import engine, Base
from app.models import User  # IMPORTANT: forces model load
from app.routes import auth
from app.routes import admin


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
