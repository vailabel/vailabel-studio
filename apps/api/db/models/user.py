from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..base import Base
from .associations import user_permissions


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Keep for backward compatibility
    role_id = Column(
        String, ForeignKey("roles.id"), nullable=True
    )  # New role relationship
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    role_obj = relationship("Role", back_populates="users")
    user_permissions = relationship(
        "Permission", secondary=user_permissions, back_populates="users"
    )
