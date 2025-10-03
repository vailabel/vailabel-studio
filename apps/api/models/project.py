from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import Field, validator
from models.base import CamelModel


class ProjectBase(CamelModel):
    name: str = Field(
        ..., min_length=1, max_length=100, description="Project name must not be empty."
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Project description"
    )
    type: str = Field(default="image_annotation", description="Project type")
    settings: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Project settings"
    )
    project_metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Project metadata"
    )
    user_id: Optional[str] = Field(None, description="User ID of the project owner")

    @validator("type")
    def validate_type(cls, v):
        allowed_types = [
            "image_annotation",
            "video_annotation",
            "text_annotation",
            "audio_annotation",
            "document_annotation",
            "object_detection",
            "segmentation",
            "classification",
        ]
        if v not in allowed_types:
            raise ValueError(f"Project type must be one of: {', '.join(allowed_types)}")
        return v


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
    name: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Project name"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Project description"
    )
    type: Optional[str] = Field(None, description="Project type")
    settings: Optional[Dict[str, Any]] = Field(None, description="Project settings")
    project_metadata: Optional[Dict[str, Any]] = Field(
        None, description="Project metadata"
    )
    status: Optional[str] = Field(None, description="Project status")

    @validator("type")
    def validate_type(cls, v):
        if v is not None:
            allowed_types = [
                "image_annotation",
                "video_annotation",
                "text_annotation",
                "audio_annotation",
                "document_annotation",
                "object_detection",
                "segmentation",
                "classification",
            ]
            if v not in allowed_types:
                raise ValueError(
                    f"Project type must be one of: {', '.join(allowed_types)}"
                )
        return v


class Project(ProjectBase):
    id: str
    status: str = Field(default="active", description="Project status")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
