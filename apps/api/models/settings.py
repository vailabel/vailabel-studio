from datetime import datetime
from typing import Optional
from models.base import CamelModel

class SettingsBase(CamelModel):
    key: str
    value: str

class SettingsCreate(SettingsBase):
    id: str

class SettingsUpdate(SettingsBase):
    key: Optional[str] = None
    value: Optional[str] = None

class Settings(SettingsBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
