from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..base import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    version = Column(String)
    model_path = Column(String)
    config_path = Column(String)
    model_size = Column(Integer)
    is_custom = Column(Boolean, default=False)

    project_id = Column(String, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
