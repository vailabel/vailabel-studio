from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models.label import Label  # Ensure this is importable or replace with dict

class HistoryBase(BaseModel):
    labels: List[Label]
    history_index: int
    can_undo: bool
    can_redo: bool
    project_id: str

class HistoryCreate(HistoryBase):
    id: str

class HistoryUpdate(BaseModel):
    labels: Optional[List[Label]]
    history_index: Optional[int]
    can_undo: Optional[bool]
    can_redo: Optional[bool]

class History(HistoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
