from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import Field, validator
from models.base import CamelModel


class Coordinate(CamelModel):
    x: float
    y: float


class AnnotationBase(CamelModel):
    name: str = Field(
        ..., min_length=1, description="Annotation name must not be empty."
    )
    type: str = Field(
        ..., min_length=1, description="Annotation type must not be empty."
    )
    coordinates: List[Coordinate]
    image_id: str = Field(..., min_length=1, description="Image ID must not be empty.")
    label_id: str = Field(..., min_length=1, description="Label ID must not be empty.")
    color: Optional[str] = None
    is_ai_generated: Optional[bool] = False


class AnnotationCreate(AnnotationBase):
    id: str = Field(..., description="Annotation ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class AnnotationUpdate(CamelModel):
    name: Optional[str] = Field(
        None, min_length=1, description="Annotation name must not be empty if provided."
    )
    type: Optional[str] = Field(
        None, min_length=1, description="Annotation type must not be empty if provided."
    )
    coordinates: Optional[List[Coordinate]] = None
    label_id: Optional[str] = Field(
        None, min_length=1, description="Label ID must not be empty if provided."
    )
    color: Optional[str] = None
    is_ai_generated: Optional[bool] = None


class Annotation(AnnotationBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
