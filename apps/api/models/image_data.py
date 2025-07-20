from pydantic import Field, validator
from datetime import datetime
from typing import Optional
from uuid import UUID
from models.base import CamelModel


class ImageDataBase(CamelModel):
    name: str = Field(..., min_length=1, description="Image name must not be empty.")
    data: str = Field(..., min_length=1, description="Data must not be empty.")
    width: int = Field(..., gt=0, description="Width must be positive.")
    height: int = Field(..., gt=0, description="Height must be positive.")
    url: Optional[str] = None
    project_id: str = Field(
        ...,
        min_length=1,
        alias="projectId",
        description="Project ID must not be empty.",
    )


class ImageDataCreate(ImageDataBase):
    id: str = Field(..., description="ImageData ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class ImageDataUpdate(CamelModel):
    name: Optional[str] = Field(
        None, min_length=1, description="Image name must not be empty if provided."
    )
    data: Optional[str] = Field(
        None, min_length=1, description="Data must not be empty if provided."
    )
    width: Optional[int] = Field(
        None, gt=0, description="Width must be positive if provided."
    )
    height: Optional[int] = Field(
        None, gt=0, description="Height must be positive if provided."
    )
    url: Optional[str] = None


class ImageData(ImageDataBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
