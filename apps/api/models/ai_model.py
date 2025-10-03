from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, Dict, Any
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

    # New fields for frontend compatibility
    type: Optional[str] = Field(
        default="custom",
        description="Model type (e.g., object_detection, classification)",
    )
    status: Optional[str] = Field(
        default="active", description="Model status (e.g., active, training, deployed)"
    )
    category: Optional[str] = Field(
        default=None, description="Model category (e.g., detection, classification)"
    )
    is_active: Optional[bool] = Field(
        default=False, description="Whether this is the currently active model"
    )
    last_used: Optional[datetime] = Field(
        default=None, description="When the model was last used"
    )
    model_metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional model metadata"
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

    # New fields for frontend compatibility
    type: Optional[str] = Field(
        default=None, description="Model type (e.g., object_detection, classification)"
    )
    status: Optional[str] = Field(
        default=None, description="Model status (e.g., active, training, deployed)"
    )
    category: Optional[str] = Field(
        default=None, description="Model category (e.g., detection, classification)"
    )
    is_active: Optional[bool] = Field(
        default=None, description="Whether this is the currently active model"
    )
    last_used: Optional[datetime] = Field(
        default=None, description="When the model was last used"
    )
    model_metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional model metadata"
    )


class AIModel(AIModelBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
