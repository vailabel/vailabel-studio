from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LabelBase(BaseModel):
    name: str
    category: Optional[str] = None
    is_ai_generated: Optional[bool] = False
    color: str
    project_id: str

class LabelCreate(LabelBase):
    id: str

class LabelUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    is_ai_generated: Optional[bool] = None
    color: Optional[str] = None

class Label(LabelBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
