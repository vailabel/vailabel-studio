from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..base import Base


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    type = Column(String)
    coordinates = Column(JSON)
    image_id = Column(String, ForeignKey("image_data.id"))
    label_id = Column(String, ForeignKey("labels.id"))
    color = Column(String, nullable=True)
    is_ai_generated = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    image = relationship("ImageData", back_populates="annotations")
    label = relationship("Label", back_populates="annotations")
