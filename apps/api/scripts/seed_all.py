#!/usr/bin/env python3
"""
Comprehensive seeding script for the VAI Label Studio API
Runs all necessary seeding operations in the correct order
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
from services.permission_service import get_permission_service
from uuid import uuid4
from datetime import datetime, timezone


def get_password_hash(password: str) -> str:
    """Hash password using SHA256 for development"""
    import hashlib

    return hashlib.sha256(password.encode()).hexdigest()


def seed_permissions_and_roles():
    """Seed permissions and roles"""
    db = next(get_db())
    permission_service = get_permission_service()

    print("🌱 Seeding permissions and roles...")

    # Default permissions
    DEFAULT_PERMISSIONS = [
        # Project permissions
        {
            "name": "projects:read",
            "description": "Read projects",
            "resource": "projects",
            "action": "read",
        },
        {
            "name": "projects:write",
            "description": "Create and update projects",
            "resource": "projects",
            "action": "write",
        },
        {
            "name": "projects:delete",
            "description": "Delete projects",
            "resource": "projects",
            "action": "delete",
        },
        # User permissions
        {
            "name": "users:read",
            "description": "Read users",
            "resource": "users",
            "action": "read",
        },
        {
            "name": "users:write",
            "description": "Create and update users",
            "resource": "users",
            "action": "write",
        },
        {
            "name": "users:delete",
            "description": "Delete users",
            "resource": "users",
            "action": "delete",
        },
        # Label permissions
        {
            "name": "labels:read",
            "description": "Read labels",
            "resource": "labels",
            "action": "read",
        },
        {
            "name": "labels:write",
            "description": "Create and update labels",
            "resource": "labels",
            "action": "write",
        },
        {
            "name": "labels:delete",
            "description": "Delete labels",
            "resource": "labels",
            "action": "delete",
        },
        # Annotation permissions
        {
            "name": "annotations:read",
            "description": "Read annotations",
            "resource": "annotations",
            "action": "read",
        },
        {
            "name": "annotations:write",
            "description": "Create and update annotations",
            "resource": "annotations",
            "action": "write",
        },
        {
            "name": "annotations:delete",
            "description": "Delete annotations",
            "resource": "annotations",
            "action": "delete",
        },
        # Task permissions
        {
            "name": "tasks:read",
            "description": "Read tasks",
            "resource": "tasks",
            "action": "read",
        },
        {
            "name": "tasks:write",
            "description": "Create and update tasks",
            "resource": "tasks",
            "action": "write",
        },
        {
            "name": "tasks:delete",
            "description": "Delete tasks",
            "resource": "tasks",
            "action": "delete",
        },
        # AI Model permissions
        {
            "name": "ai_models:read",
            "description": "Read AI models",
            "resource": "ai_models",
            "action": "read",
        },
        {
            "name": "ai_models:write",
            "description": "Create and update AI models",
            "resource": "ai_models",
            "action": "write",
        },
        {
            "name": "ai_models:delete",
            "description": "Delete AI models",
            "resource": "ai_models",
            "action": "delete",
        },
        # Settings permissions
        {
            "name": "settings:read",
            "description": "Read settings",
            "resource": "settings",
            "action": "read",
        },
        {
            "name": "settings:write",
            "description": "Create and update settings",
            "resource": "settings",
            "action": "write",
        },
        {
            "name": "settings:delete",
            "description": "Delete settings",
            "resource": "settings",
            "action": "delete",
        },
        # Permission management
        {
            "name": "permissions:read",
            "description": "Read permissions",
            "resource": "permissions",
            "action": "read",
        },
        {
            "name": "permissions:write",
            "description": "Create and update permissions",
            "resource": "permissions",
            "action": "write",
        },
        {
            "name": "permissions:delete",
            "description": "Delete permissions",
            "resource": "permissions",
            "action": "delete",
        },
        # Role management
        {
            "name": "roles:read",
            "description": "Read roles",
            "resource": "roles",
            "action": "read",
        },
        {
            "name": "roles:write",
            "description": "Create and update roles",
            "resource": "roles",
            "action": "write",
        },
        {
            "name": "roles:delete",
            "description": "Delete roles",
            "resource": "roles",
            "action": "delete",
        },
    ]

    # Default roles with their permissions
    DEFAULT_ROLES = {
        "admin": {
            "description": "Administrator with full access",
            "permissions": [perm["name"] for perm in DEFAULT_PERMISSIONS],
        },
        "manager": {
            "description": "Manager with project and user management access",
            "permissions": [
                "projects:read",
                "projects:write",
                "projects:delete",
                "users:read",
                "users:write",
                "labels:read",
                "labels:write",
                "labels:delete",
                "annotations:read",
                "annotations:write",
                "annotations:delete",
                "tasks:read",
                "tasks:write",
                "tasks:delete",
                "ai_models:read",
                "ai_models:write",
                "settings:read",
                "settings:write",
            ],
        },
        "annotator": {
            "description": "Annotator with project access",
            "permissions": [
                "projects:read",
                "labels:read",
                "labels:write",
                "annotations:read",
                "annotations:write",
                "tasks:read",
                "tasks:write",
                "ai_models:read",
            ],
        },
        "viewer": {
            "description": "Viewer with read-only access",
            "permissions": [
                "projects:read",
                "labels:read",
                "annotations:read",
                "tasks:read",
                "ai_models:read",
                "settings:read",
            ],
        },
    }

    # Create permissions
    created_permissions = {}
    for perm_data in DEFAULT_PERMISSIONS:
        existing = permission_service.get_permission_by_name(db, perm_data["name"])
        if not existing:
            from models.permission import PermissionCreate

            permission_create = PermissionCreate(
                id=str(uuid4()),
                name=perm_data["name"],
                description=perm_data["description"],
                resource=perm_data["resource"],
                action=perm_data["action"],
            )
            permission = permission_service.create_permission(db, permission_create)
            created_permissions[perm_data["name"]] = permission
            print(f"✅ Created permission: {perm_data['name']}")
        else:
            created_permissions[perm_data["name"]] = existing
            print(f"⏭️  Permission already exists: {perm_data['name']}")

    # Create roles
    created_roles = {}
    for role_name, role_data in DEFAULT_ROLES.items():
        existing = permission_service.get_role_by_name(db, role_name)
        if not existing:
            # Get permission IDs for this role
            permission_ids = []
            for perm_name in role_data["permissions"]:
                if perm_name in created_permissions:
                    permission_ids.append(created_permissions[perm_name].id)

            from models.permission import RoleCreate

            role_create = RoleCreate(
                id=str(uuid4()),
                name=role_name,
                description=role_data["description"],
                permission_ids=permission_ids,
            )
            role = permission_service.create_role(db, role_create)
            created_roles[role_name] = role
            print(
                f"✅ Created role: {role_name} with {len(permission_ids)} permissions"
            )
        else:
            created_roles[role_name] = existing
            print(f"⏭️  Role already exists: {role_name}")

    return created_permissions, created_roles


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
        print("❌ Admin role not found. Please run permissions seeding first.")
        return None

    # Create admin user
    admin_user = User(
        id=str(uuid4()),
        email="admin@example.com",
        name="Admin User",
        password=get_password_hash("admin123"),  # Hashed password
        role="admin",  # Keep for backward compatibility
        role_id=admin_role.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print(f"✅ Created admin user: {admin_user.email}")
    return admin_user


def seed_sample_data():
    """Create sample data for development"""
    db = next(get_db())

    print("🌱 Creating sample data...")

    # This could include sample projects, labels, etc.
    # For now, we'll just print that it's ready for future expansion
    print("✅ Sample data seeding ready for future expansion")

    return True


def main():
    """Main seeding function"""
    print("🚀 Starting VAI Label Studio API seeding...")
    print("=" * 50)

    try:
        # Step 1: Seed permissions and roles
        print("\n📋 Step 1: Seeding permissions and roles")
        print("-" * 40)
        permissions, roles = seed_permissions_and_roles()

        # Step 2: Create admin user
        print("\n👤 Step 2: Creating admin user")
        print("-" * 40)
        admin_user = seed_admin_user()

        # Step 3: Create sample data (optional)
        print("\n📊 Step 3: Creating sample data")
        print("-" * 40)
        seed_sample_data()

        # Summary
        print("\n" + "=" * 50)
        print("🎉 Seeding completed successfully!")
        print("=" * 50)
        print(f"📋 Created/verified {len(permissions)} permissions")
        print(f"👥 Created/verified {len(roles)} roles")
        if admin_user:
            print(f"👤 Admin user: admin@example.com")
            print(f"🔑 Password: admin123")
        print("\n🚀 You can now start the API server!")

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
