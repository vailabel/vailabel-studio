from typing import Optional, List
from datetime import datetime
from models.label import Label  
from models.annotation import Annotation
from models.base import CamelModel

class TaskBase(CamelModel):
    name: str
    description: str
    project_id: str
    assigned_to: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    labels: Optional[List[Label]] = []
    annotations: Optional[List[Annotation]] = []

class TaskCreate(TaskBase):
    id: str

class TaskUpdate(TaskBase):
    name: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    labels: Optional[List[Label]] = None
    annotations: Optional[List[Annotation]] = None

class Task(TaskBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
