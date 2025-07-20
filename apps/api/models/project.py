from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import Field, validator
from models.base import CamelModel


class ProjectBase(CamelModel):
    name: str = Field(..., min_length=1, description="Project name must not be empty.")


class ProjectCreate(ProjectBase):
    id: str = Field(..., description="Project ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class ProjectUpdate(ProjectBase):
    pass


class Project(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
