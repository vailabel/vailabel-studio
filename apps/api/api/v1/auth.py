from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from services.auth_service import oauth2_token_endpoint, get_current_active_user

# Role-based authorization dependency
from fastapi import Security
from typing import List
from db.session import get_db
from db.models.user import User

from pydantic import BaseModel


# Pydantic schema for user output
class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True


router = APIRouter(tags=["Auth"], prefix="/api/v1/auth")


# Authorization dependency
def require_roles(roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )
        return current_user

    return role_checker


# OAuth2 token endpoint
@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    return oauth2_token_endpoint(form_data, db)


# Get current user info
@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


# Example: Protected route for admins only
@router.get("/admin", response_model=UserOut)
def read_admin_data(current_user: User = Depends(require_roles(["admin"]))):
    return current_user
