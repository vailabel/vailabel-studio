from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..base import Base


class Label(Base):
    __tablename__ = "labels"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    color = Column(String, nullable=False)

    project_id = Column(String, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project = relationship("Project", back_populates="labels")
    annotations = relationship("Annotation", back_populates="label")
