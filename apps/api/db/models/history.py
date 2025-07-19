from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON
from datetime import datetime, timezone
from ..base import Base

class History(Base):
    __tablename__ = "history"

    id = Column(String, primary_key=True, index=True)
    labels = Column(JSON, nullable=False)
    history_index = Column(Integer, nullable=False)
    can_undo = Column(Boolean, default=False)
    can_redo = Column(Boolean, default=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="history")
