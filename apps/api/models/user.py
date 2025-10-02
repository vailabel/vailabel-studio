from pydantic import EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from models.base import CamelModel


class UserBase(CamelModel):
    email: EmailStr
    name: str = Field(..., min_length=1, description="User name must not be empty.")
    role: str = Field(..., min_length=1, description="Role must not be empty.")


class UserCreate(UserBase):
    id: str = Field(..., description="User ID must be a valid UUID.")
    password: str = Field(
        ..., min_length=6, description="Password must be at least 6 characters."
    )

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class UserUpdate(CamelModel):
    name: Optional[str] = Field(
        None, min_length=1, description="User name must not be empty if provided."
    )
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(
        None,
        min_length=6,
        description="Password must be at least 6 characters if provided.",
    )
    role: Optional[str] = Field(
        None, min_length=1, description="Role must not be empty if provided."
    )


class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    permissions: Optional[List[str]] = []  # List of permission names
    roles: Optional[List[str]] = []  # List of role names for backward compatibility

    model_config = {"from_attributes": True}
