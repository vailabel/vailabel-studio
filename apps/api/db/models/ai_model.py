from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON
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

    # New fields for frontend compatibility
    type = Column(
        String, default="custom"
    )  # e.g., "object_detection", "classification", "segmentation"
    status = Column(
        String, default="active"
    )  # e.g., "active", "training", "deployed", "failed", "inactive"
    category = Column(String)  # e.g., "detection", "classification", "segmentation"
    is_active = Column(Boolean, default=False)  # Currently active model
    last_used = Column(DateTime)  # When the model was last used
    model_metadata = Column(JSON)  # Additional metadata like accuracy, speed, etc.

    project_id = Column(String, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
