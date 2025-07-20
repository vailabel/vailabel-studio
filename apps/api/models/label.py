from pydantic import Field, validator
from datetime import datetime
from typing import Optional
from uuid import UUID
from models.base import CamelModel


class LabelBase(CamelModel):
    name: str = Field(..., min_length=1, description="Label name must not be empty.")
    category: Optional[str] = None
    is_ai_generated: Optional[bool] = False
    color: str = Field(..., min_length=1, description="Color must not be empty.")
    project_id: str = Field(
        ...,
        min_length=1,
        alias="projectId",
        description="Project ID must not be empty.",
    )


class LabelCreate(LabelBase):
    id: str = Field(..., description="Label ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class LabelUpdate(LabelBase):
    name: Optional[str] = Field(
        None, min_length=1, description="Label name must not be empty if provided."
    )
    category: Optional[str] = None
    is_ai_generated: Optional[bool] = Field(False, alias="isAiGenerated")
    color: Optional[str] = Field(
        None, min_length=1, description="Color must not be empty if provided."
    )


class Label(LabelBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
