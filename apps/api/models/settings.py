from datetime import datetime
from typing import Optional
from uuid import UUID
from models.base import CamelModel
from pydantic import Field, validator


class SettingsBase(CamelModel):
    key: str = Field(..., min_length=1, description="Key must not be empty.")
    value: str = Field(..., min_length=1, description="Value must not be empty.")


class SettingsCreate(SettingsBase):
    id: str = Field(..., description="Settings ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class SettingsUpdate(SettingsBase):
    key: Optional[str] = Field(
        None, min_length=1, description="Key must not be empty if provided."
    )
    value: Optional[str] = Field(
        None, min_length=1, description="Value must not be empty if provided."
    )


class Settings(SettingsBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
