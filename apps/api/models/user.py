from pydantic import  EmailStr
from typing import Optional
from datetime import datetime
from models.base import CamelModel

class UserBase(CamelModel):
    email: EmailStr
    name: str
    role: str

class UserCreate(UserBase):
    id: str
    password: str

class UserUpdate(CamelModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
