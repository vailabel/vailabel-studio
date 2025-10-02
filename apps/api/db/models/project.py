from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(
        String, nullable=False, default="image_annotation"
    )  # image_annotation, video_annotation, text_annotation, audio_annotation, document_annotation
    status = Column(
        String, nullable=False, default="active"
    )  # active, archived, deleted
    settings = Column(JSON, nullable=True)  # Project-specific settings
    project_metadata = Column(JSON, nullable=True)  # Additional metadata
    user_id = Column(
        String, ForeignKey("users.id"), nullable=True
    )  # Owner of the project
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="projects")
    labels = relationship(
        "Label", back_populates="project", cascade="all, delete-orphan"
    )
    images = relationship(
        "ImageData", back_populates="project", cascade="all, delete-orphan"
    )
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    history = relationship(
        "History", back_populates="project", cascade="all, delete-orphan"
    )
    ai_models = relationship(
        "AIModel", back_populates="project", cascade="all, delete-orphan"
    )
