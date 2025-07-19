from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from ..base import Base

class ImageData(Base):
    __tablename__ = "image_data"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    data = Column(Text, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    url = Column(String, nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="images")
    annotations = relationship("Annotation", back_populates="image")
