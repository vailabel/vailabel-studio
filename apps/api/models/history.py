from pydantic import Field, validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from models.label import Label
from models.base import CamelModel


class HistoryBase(CamelModel):
    labels: List[Label]
    history_index: int = Field(
        ..., ge=0, description="History index must be non-negative."
    )
    can_undo: bool
    can_redo: bool
    project_id: str = Field(
        ..., min_length=1, description="Project ID must not be empty."
    )


class HistoryCreate(HistoryBase):
    id: str = Field(..., description="History ID must be a valid UUID.")

    @validator("id")
    def validate_id(cls, v):
        try:
            UUID(v)
        except Exception:
            raise ValueError("id must be a valid UUID string.")
        return v


class HistoryUpdate(CamelModel):
    labels: Optional[List[Label]]
    history_index: Optional[int] = Field(
        None,
        ge=0,
        alias="historyIndex",
        description="History index must be non-negative if provided.",
    )
    can_undo: Optional[bool] = Field(None, alias="canUndo")
    can_redo: Optional[bool] = Field(None, alias="canRedo")


class History(HistoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
