from pydantic import Field
from datetime import datetime
from typing import Optional
from models.base import CamelModel

class ImageDataBase(CamelModel):
    name: str
    data: str  # Could be base64 or URL or blob depending on usage
    width: int
    height: int
    url: Optional[str] = None
    project_id: str = Field(..., alias="projectId")

class ImageDataCreate(ImageDataBase):
    id: str

class ImageDataUpdate(CamelModel):
    name: Optional[str] = None
    data: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    url: Optional[str] = None

class ImageData(ImageDataBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        orm_mode = True
