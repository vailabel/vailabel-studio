from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional
from models.base import CamelModel


class AIModelBase(CamelModel):
    name: str = Field(..., min_length=1, description="Model name must not be empty.")
    description: str = Field(
        ..., min_length=1, description="Description must not be empty."
    )
    version: str = Field(..., min_length=1, description="Version must not be empty.")
    model_path: str = Field(
        ..., min_length=1, description="Model path must not be empty."
    )
    config_path: str = Field(
        ..., min_length=1, description="Config path must not be empty."
    )
    model_size: int = Field(
        ..., gt=0, description="Model size must be a positive integer."
    )
    is_custom: bool
    project_id: str = Field(
        ..., min_length=1, description="Project ID must not be empty."
    )


class AIModelCreate(AIModelBase):
    id: str = Field(..., description="Model ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        from uuid import UUID

        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class AIModelUpdate(CamelModel):
    name: Optional[str] = Field(
        None, min_length=1, description="Model name must not be empty if provided."
    )
    description: Optional[str] = Field(
        None, min_length=1, description="Description must not be empty if provided."
    )
    version: Optional[str] = Field(
        None, min_length=1, description="Version must not be empty if provided."
    )
    model_path: Optional[str] = Field(
        None, min_length=1, description="Model path must not be empty if provided."
    )
    config_path: Optional[str] = Field(
        None, min_length=1, description="Config path must not be empty if provided."
    )
    model_size: Optional[int] = Field(
        None, gt=0, description="Model size must be a positive integer if provided."
    )
    is_custom: Optional[bool] = None


class AIModel(AIModelBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
