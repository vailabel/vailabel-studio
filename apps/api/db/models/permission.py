from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..base import Base
from .associations import user_permissions, role_permissions


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, index=True)
    name = Column(
        String, unique=True, nullable=False
    )  # e.g., "projects:read", "projects:write"
    description = Column(String, nullable=True)
    resource = Column(String, nullable=False)  # e.g., "projects", "users", "settings"
    action = Column(String, nullable=False)  # e.g., "read", "write", "delete"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    users = relationship(
        "User", secondary=user_permissions, back_populates="user_permissions"
    )
    roles = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )


class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, index=True)
    name = Column(
        String, unique=True, nullable=False
    )  # e.g., "admin", "manager", "annotator"
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    users = relationship("User", back_populates="role_obj")
    permissions = relationship(
        "Permission", secondary=role_permissions, back_populates="roles"
    )
