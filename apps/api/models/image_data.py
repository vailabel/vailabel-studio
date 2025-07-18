from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ImageDataBase(BaseModel):
    name: str
    data: str  # Could be base64 or URL or blob depending on usage
    width: int
    height: int
    url: Optional[str] = None
    project_id: str

class ImageDataCreate(ImageDataBase):
    id: str

class ImageDataUpdate(BaseModel):
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
        orm_mode = True
