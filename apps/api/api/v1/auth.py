from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.user import LoginRequest, User
from services.auth_service import authenticate, logout_user
from db.session import get_db

router = APIRouter(tags=["Auth"])

@router.post("/api/v1/login", response_model=User)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, data.username, data.password)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    return user

@router.get("/logout")
def logout():
    logout_user()
    return {"message": "logged out"}

@router.get("/sync")
def sync_all(db: Session = Depends(get_db)):
    # Add sync logic if needed
    return {"message": "sync complete"}
