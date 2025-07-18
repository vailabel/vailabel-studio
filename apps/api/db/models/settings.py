from sqlalchemy import Column, String, DateTime
from datetime import datetime
from ..base import Base

class Settings(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, index=True)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
