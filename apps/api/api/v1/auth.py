from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from services.auth_service import (
    oauth2_token_endpoint,
    get_current_active_user,
    authenticate_user,
    create_access_token,
)

# Role-based authorization dependency
from fastapi import Security
from typing import List
from db.session import get_db
from db.models.user import User
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: Optional[List[str]] = []
    roles: Optional[List[str]] = []

    class Config:
        from_attributes = True


# Pydantic schema for login request
class LoginRequest(BaseModel):
    email: str
    password: str


# Pydantic schema for login response
class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


router = APIRouter(tags=["Auth"], prefix="/api/v1/auth")


# Authorization dependencies
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


def require_permissions(permissions: List[str]):
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ):
        from services.permission_service import get_permission_service

        permission_service = get_permission_service()

        user_permissions = permission_service.get_user_permissions(db, current_user)

        # Check if user has any of the required permissions
        has_permission = any(perm in user_permissions for perm in permissions)

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required permissions: {', '.join(permissions)}",
            )
        return current_user

    return permission_checker


def require_permission(permission: str):
    """Single permission requirement"""
    return require_permissions([permission])


# OAuth2 token endpoint
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


# JSON login endpoint for frontend
@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    from services.auth_service import get_user_with_permissions

    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user with permissions
    user_with_permissions = get_user_with_permissions(db, user)

    access_token = create_access_token(data={"sub": user.email})
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user_with_permissions),
    )


# Get current user info
@router.get("/me", response_model=UserOut)
def read_users_me(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    from services.auth_service import get_user_with_permissions

    return get_user_with_permissions(db, current_user)


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