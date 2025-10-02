#!/usr/bin/env python3
"""
Seed script to populate the database with default permissions and roles
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from db.session import get_db
from services.permission_service import get_permission_service
from db.models.permission import Permission, Role
from db.models.user import User
from uuid import uuid4

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
            "ai_models:read",
        ],
    },
    "viewer": {
        "description": "Viewer with read-only access",
        "permissions": [
            "projects:read",
            "ai_models:read",
            "settings:read",
        ],
    },
}


def seed_permissions():
    """Seed the database with default permissions and roles"""
    db = next(get_db())
    permission_service = get_permission_service()

    print("🌱 Seeding permissions and roles...")

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

    # Update admin user to have admin role
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if admin_user and "admin" in created_roles:
        admin_role = created_roles["admin"]
        admin_user.role_id = admin_role.id
        db.commit()
        print(f"✅ Updated admin user with admin role")

    print("🎉 Seeding completed!")
    return created_permissions, created_roles


if __name__ == "__main__":
    try:
        seed_permissions()
    except Exception as e:
        print(f"❌ Error seeding permissions: {e}")
        sys.exit(1)
