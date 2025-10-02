from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from services.auth_service import oauth2_token_endpoint, get_current_active_user
from fastapi import Security
from typing import List
from db.session import get_db
from db.models.user import User
from pydantic import BaseModel


class UserOut(BaseModel):
    """
    Schema for user output representation.
    
    Attributes:
        id: Unique identifier of the user
        email: User's email address
        name: User's full name
        role: User's role in the system
        created_at: Timestamp of user creation
        updated_at: Timestamp of last update
    """
    id: str
    email: str
    name: str
    role: str
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True


router = APIRouter(tags=["Auth"], prefix="/api/v1/auth")


def require_roles(roles: List[str]):
    """
    Create a dependency that checks if the current user has one of the required roles.
    
    Args:
        roles: List of allowed roles
    
    Returns:
        Dependency function that validates user role
    
    Raises:
        HTTPException: 403 error if user doesn't have required permissions
    """
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )
        return current_user
    return role_checker


@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    OAuth2 token endpoint for user authentication.
    
    Args:
        form_data: OAuth2 password request form containing username and password
        db: Database session dependency
    
    Returns:
        Access token and token type for authenticated user
    """
    return oauth2_token_endpoint(form_data, db)


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Retrieve the current authenticated user's information.
    
    Args:
        current_user: Currently authenticated user dependency
    
    Returns:
        Current user's profile information
    """
    return current_user


@router.get("/admin", response_model=UserOut)
def read_admin_data(current_user: User = Depends(require_roles(["admin"]))):
    """
    Protected endpoint accessible only to users with admin role.
    
    Args:
        current_user: Currently authenticated user with admin role dependency
    
    Returns:
        Current admin user's profile information
    
    Raises:
        HTTPException: 403 error if user is not an admin
    """
    return current_user