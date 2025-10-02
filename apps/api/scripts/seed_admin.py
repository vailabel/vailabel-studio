#!/usr/bin/env python3
"""
Seed script to create a default admin user for local mode authentication.
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from db.session import get_db
from db.models.user import User


# For local mode, we'll use a simple plain text password
# In production, this should be properly hashed
def get_password_hash(password: str) -> str:
    return password  # Plain text for local mode


import uuid
from datetime import datetime, timezone


def create_admin_user():
    """Create a default admin user for local mode."""
    db = next(get_db())

    # Check if admin user already exists
    existing_admin = db.query(User).filter(User.email == "admin@example.com").first()
    if existing_admin:
        print("Admin user already exists!")
        return existing_admin

    # Create admin user
    admin_user = User(
        id=str(uuid.uuid4()),
        email="admin@example.com",
        name="Admin User",
        password=get_password_hash("admin123"),  # Default password
        role="admin",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print(f"Admin user created successfully!")
    print(f"Email: {admin_user.email}")
    print(f"Password: admin123")
    print(f"Role: {admin_user.role}")

    return admin_user


if __name__ == "__main__":
    create_admin_user()
