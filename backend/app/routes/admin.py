from fastapi import APIRouter, Depends, HTTPException
from jose import jwt

router = APIRouter(prefix="/admin", tags=["Admin"])

SECRET_KEY = "SECRET_KEY_CHANGE_LATER"
ALGORITHM = "HS256"

def admin_required(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

@router.get("/dashboard")
def admin_dashboard(token: str):
    admin_required(token)
    return {"message": "Welcome Admin"}
