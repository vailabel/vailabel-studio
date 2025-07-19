from pydantic import  Field
from typing import List, Optional
from datetime import datetime
from models.label import Label 
from models.base import CamelModel

class HistoryBase(CamelModel):
    labels: List[Label]
    history_index: int
    can_undo: bool
    can_redo: bool
    project_id: str

class HistoryCreate(HistoryBase):
    id: str

class HistoryUpdate(CamelModel):
    labels: Optional[List[Label]] 
    history_index: Optional[int] = Field(..., alias="historyIndex") 
    can_undo: Optional[bool] = Field(..., alias="canUndo")
    can_redo: Optional[bool] = Field(..., alias="canRedo")

class History(HistoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        orm_mode = True
