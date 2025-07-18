from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Coordinate(BaseModel):
    x: float
    y: float

class AnnotationBase(BaseModel):
    name: str
    type: str
    coordinates: List[Coordinate]
    image_id: str
    label_id: str
    color: Optional[str] = None
    is_ai_generated: Optional[bool] = False

class AnnotationCreate(AnnotationBase):
    id: str

class AnnotationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    coordinates: Optional[List[Coordinate]] = None
    label_id: Optional[str] = None
    color: Optional[str] = None
    is_ai_generated: Optional[bool] = None

class Annotation(AnnotationBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
