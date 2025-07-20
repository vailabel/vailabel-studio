from pydantic import Field
from datetime import datetime
from typing import Optional
from models.base import CamelModel


class LabelBase(CamelModel):
    name: str
    category: Optional[str] = None
    is_ai_generated: Optional[bool] = False
    color: str
    project_id: str = Field(..., alias="projectId")


class LabelCreate(LabelBase):
    id: str


class LabelUpdate(LabelBase):
    name: Optional[str] = None
    category: Optional[str] = None
    is_ai_generated: Optional[bool] = Field(False, alias="isAiGenerated")
    color: Optional[str] = None


class Label(LabelBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        orm_mode = True
