from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SettingsBase(BaseModel):
    key: str
    value: str

class SettingsCreate(SettingsBase):
    id: str

class SettingsUpdate(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None

class Settings(SettingsBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
