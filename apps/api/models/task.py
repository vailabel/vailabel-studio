from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import Field, validator
from models.label import Label
from models.annotation import Annotation
from models.base import CamelModel


class TaskBase(CamelModel):
    name: str = Field(..., min_length=1, description="Task name must not be empty.")
    description: str = Field(
        ..., min_length=1, description="Description must not be empty."
    )
    project_id: str = Field(
        ..., min_length=1, description="Project ID must not be empty."
    )
    assigned_to: Optional[str] = None
    status: str = Field(..., min_length=1, description="Status must not be empty.")
    due_date: Optional[datetime] = None
    labels: Optional[List[Label]] = []
    annotations: Optional[List[Annotation]] = []


class TaskCreate(TaskBase):
    id: str = Field(..., description="Task ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class TaskUpdate(TaskBase):
    name: Optional[str] = Field(
        None, min_length=1, description="Task name must not be empty if provided."
    )
    description: Optional[str] = Field(
        None, min_length=1, description="Description must not be empty if provided."
    )
    assigned_to: Optional[str] = None
    status: Optional[str] = Field(
        None, min_length=1, description="Status must not be empty if provided."
    )
    due_date: Optional[datetime] = None
    labels: Optional[List[Label]] = None
    annotations: Optional[List[Annotation]] = None


class Task(TaskBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
