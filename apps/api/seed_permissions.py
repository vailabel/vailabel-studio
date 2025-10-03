#!/usr/bin/env python3
"""
Seed script for permissions and roles
Creates default permissions and roles for the application
"""

import sys
import os
from uuid import uuid4

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.session import get_db
from db.models.permission import Permission, Role
from db.models.user import User
from services.permission_service import get_permission_service
from models.permission import PermissionCreate, RoleCreate


def seed_permissions():
    """Create default permissions"""
    db = next(get_db())
    permission_service = get_permission_service()

    # Define default permissions
    permissions_data = [
        # Project permissions
        {
            "name": "projects:read",
            "resource": "projects",
            "action": "read",
            "description": "View projects",
        },
        {
            "name": "projects:write",
            "resource": "projects",
            "action": "write",
            "description": "Create and edit projects",
        },
        {
            "name": "projects:delete",
            "resource": "projects",
            "action": "delete",
            "description": "Delete projects",
        },
        # User permissions
        {
            "name": "users:read",
            "resource": "users",
            "action": "read",
            "description": "View users",
        },
        {
            "name": "users:write",
            "resource": "users",
            "action": "write",
            "description": "Create and edit users",
        },
        {
            "name": "users:delete",
            "resource": "users",
            "action": "delete",
            "description": "Delete users",
        },
        # Label permissions
        {
            "name": "labels:read",
            "resource": "labels",
            "action": "read",
            "description": "View labels",
        },
        {
            "name": "labels:write",
            "resource": "labels",
            "action": "write",
            "description": "Create and edit labels",
        },
        {
            "name": "labels:delete",
            "resource": "labels",
            "action": "delete",
            "description": "Delete labels",
        },
        # Annotation permissions
        {
            "name": "annotations:read",
            "resource": "annotations",
            "action": "read",
            "description": "View annotations",
        },
        {
            "name": "annotations:write",
            "resource": "annotations",
            "action": "write",
            "description": "Create and edit annotations",
        },
        {
            "name": "annotations:delete",
            "resource": "annotations",
            "action": "delete",
            "description": "Delete annotations",
        },
        # Task permissions
        {
            "name": "tasks:read",
            "resource": "tasks",
            "action": "read",
            "description": "View tasks",
        },
        {
            "name": "tasks:write",
            "resource": "tasks",
            "action": "write",
            "description": "Create and edit tasks",
        },
        {
            "name": "tasks:delete",
            "resource": "tasks",
            "action": "delete",
            "description": "Delete tasks",
        },
        # Settings permissions
        {
            "name": "settings:read",
            "resource": "settings",
            "action": "read",
            "description": "View settings",
        },
        {
            "name": "settings:write",
            "resource": "settings",
            "action": "write",
            "description": "Modify settings",
        },
        # AI Model permissions
        {
            "name": "ai_models:read",
            "resource": "ai_models",
            "action": "read",
            "description": "View AI models",
        },
        {
            "name": "ai_models:write",
            "resource": "ai_models",
            "action": "write",
            "description": "Create and edit AI models",
        },
        {
            "name": "ai_models:delete",
            "resource": "ai_models",
            "action": "delete",
            "description": "Delete AI models",
        },
        # Permission management
        {
            "name": "permissions:read",
            "resource": "permissions",
            "action": "read",
            "description": "View permissions",
        },
        {
            "name": "permissions:write",
            "resource": "permissions",
            "action": "write",
            "description": "Manage permissions",
        },
        {
            "name": "permissions:delete",
            "resource": "permissions",
            "action": "delete",
            "description": "Delete permissions",
        },
    ]

    created_permissions = []

    for perm_data in permissions_data:
        # Check if permission already exists
        existing = permission_service.get_permission_by_name(db, perm_data["name"])
        if existing:
            print(f"Permission '{perm_data['name']}' already exists")
            created_permissions.append(existing)
            continue

        # Create new permission
        permission = PermissionCreate(
            id=str(uuid4()),
            name=perm_data["name"],
            resource=perm_data["resource"],
            action=perm_data["action"],
            description=perm_data["description"],
        )

        try:
            created_perm = permission_service.create_permission(db, permission)
            created_permissions.append(created_perm)
            print(f"Created permission: {perm_data['name']}")
        except Exception as e:
            print(f"Error creating permission {perm_data['name']}: {e}")

    db.close()
    return created_permissions


def seed_roles():
    """Create default roles"""
    db = next(get_db())
    permission_service = get_permission_service()

    # Get all permissions
    all_permissions = permission_service.get_permissions(db)
    permission_map = {p.name: p.id for p in all_permissions}

    # Define default roles
    roles_data = [
        {
            "name": "admin",
            "description": "Full system access",
            "permissions": list(permission_map.keys()),  # All permissions
        },
        {
            "name": "manager",
            "description": "Project and user management",
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
                "settings:read",
                "settings:write",
                "ai_models:read",
                "ai_models:write",
            ],
        },
        {
            "name": "annotator",
            "description": "Annotation and labeling tasks",
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
        {
            "name": "viewer",
            "description": "Read-only access",
            "permissions": [
                "projects:read",
                "labels:read",
                "annotations:read",
                "tasks:read",
                "ai_models:read",
            ],
        },
    ]

    created_roles = []

    for role_data in roles_data:
        # Check if role already exists
        existing = permission_service.get_role_by_name(db, role_data["name"])
        if existing:
            print(f"Role '{role_data['name']}' already exists")
            created_roles.append(existing)
            continue

        # Get permission IDs for this role
        permission_ids = [
            permission_map[perm]
            for perm in role_data["permissions"]
            if perm in permission_map
        ]

        # Create new role
        role = RoleCreate(
            id=str(uuid4()),
            name=role_data["name"],
            description=role_data["description"],
            permission_ids=permission_ids,
        )

        try:
            created_role = permission_service.create_role(db, role)
            created_roles.append(created_role)
            print(
                f"Created role: {role_data['name']} with {len(permission_ids)} permissions"
            )
        except Exception as e:
            print(f"Error creating role {role_data['name']}: {e}")

    db.close()
    return created_roles


def assign_admin_role():
    """Assign admin role to the admin user"""
    db = next(get_db())
    permission_service = get_permission_service()

    # Find admin user
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin_user:
        print("Admin user not found")
        db.close()
        return

    # Find admin role
    admin_role = permission_service.get_role_by_name(db, "admin")
    if not admin_role:
        print("Admin role not found")
        db.close()
        return

    # Assign role to user
    admin_user.role_id = admin_role.id
    db.commit()

    print(f"Assigned admin role to user: {admin_user.email}")
    db.close()


def main():
    """Main seeding function"""
    print("Starting permission and role seeding...")

    try:
        # Seed permissions
        print("\n=== Seeding Permissions ===")
        permissions = seed_permissions()
        print(f"Created/verified {len(permissions)} permissions")

        # Seed roles
        print("\n=== Seeding Roles ===")
        roles = seed_roles()
        print(f"Created/verified {len(roles)} roles")

        # Assign admin role
        print("\n=== Assigning Admin Role ===")
        assign_admin_role()

        print("\n=== Seeding Complete ===")
        print("Permission system has been successfully seeded!")

    except Exception as e:
        print(f"Error during seeding: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
