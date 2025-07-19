from datetime import datetime
from typing import Optional
from models.base import CamelModel

class ProjectBase(CamelModel):
    name: str

class ProjectCreate(ProjectBase):
    id: str

class ProjectUpdate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
