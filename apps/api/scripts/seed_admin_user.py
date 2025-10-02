#!/usr/bin/env python3
"""
Seed script to create admin user with admin role
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from db.session import get_db
from db.models.user import User
from db.models.permission import Role
from uuid import uuid4


def seed_admin_user():
    """Create admin user with admin role"""
    db = next(get_db())

    print("🌱 Creating admin user...")

    # Check if admin user already exists
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if admin_user:
        print(f"⏭️  Admin user already exists: {admin_user.email}")

        # Update admin user to have admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            admin_user.role_id = admin_role.id
            db.commit()
            print(f"✅ Updated admin user with admin role")
        return admin_user

    # Get admin role
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        print("❌ Admin role not found. Please run seed_permissions.py first.")
        return None

    # Create admin user
    admin_user = User(
        id=str(uuid4()),
        email="admin@example.com",
        name="Admin User",
        password="admin123",  # Plain text for local mode
        role="admin",  # Keep for backward compatibility
        role_id=admin_role.id,
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print(f"✅ Created admin user: {admin_user.email}")
    return admin_user


if __name__ == "__main__":
    try:
        seed_admin_user()
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        sys.exit(1)
