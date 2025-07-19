from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from ..base import Base

class Settings(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, index=True)
    key = Column(String, nullable=False, unique=True)
    value = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
