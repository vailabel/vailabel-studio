from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.base import CamelModel


class AIModelBase(CamelModel):
    name: str
    description: str
    version: str
    model_path: str
    config_path: str
    model_size: int
    is_custom: bool
    project_id: str


class AIModelCreate(AIModelBase):
    id: str


class AIModelUpdate(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    model_path: Optional[str] = None
    config_path: Optional[str] = None
    model_size: Optional[int] = None
    is_custom: Optional[bool] = None


class AIModel(AIModelBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
