from typing import List, Optional
from sqlalchemy.orm import Session
from db.models.permission import Permission, Role
from db.models.user import User
from models.permission import PermissionCreate, PermissionUpdate, RoleCreate, RoleUpdate
from uuid import uuid4


class PermissionService:
    def get_permissions(self, db: Session) -> List[Permission]:
        return db.query(Permission).all()

    def get_permission_by_id(
        self, db: Session, permission_id: str
    ) -> Optional[Permission]:
        return db.query(Permission).filter(Permission.id == permission_id).first()

    def get_permission_by_name(self, db: Session, name: str) -> Optional[Permission]:
        return db.query(Permission).filter(Permission.name == name).first()

    def create_permission(
        self, db: Session, permission: PermissionCreate
    ) -> Permission:
        db_permission = Permission(
            id=permission.id,
            name=permission.name,
            description=permission.description,
            resource=permission.resource,
            action=permission.action,
        )
        db.add(db_permission)
        db.commit()
        db.refresh(db_permission)
        return db_permission

    def update_permission(
        self, db: Session, permission_id: str, permission: PermissionUpdate
    ) -> Optional[Permission]:
        db_permission = self.get_permission_by_id(db, permission_id)
        if not db_permission:
            return None

        for field, value in permission.model_dump(exclude_unset=True).items():
            setattr(db_permission, field, value)

        db.commit()
        db.refresh(db_permission)
        return db_permission

    def delete_permission(self, db: Session, permission_id: str) -> bool:
        db_permission = self.get_permission_by_id(db, permission_id)
        if not db_permission:
            return False

        db.delete(db_permission)
        db.commit()
        return True

    def get_roles(self, db: Session) -> List[Role]:
        return db.query(Role).all()

    def get_role_by_id(self, db: Session, role_id: str) -> Optional[Role]:
        return db.query(Role).filter(Role.id == role_id).first()

    def get_role_by_name(self, db: Session, name: str) -> Optional[Role]:
        return db.query(Role).filter(Role.name == name).first()

    def create_role(self, db: Session, role: RoleCreate) -> Role:
        db_role = Role(
            id=role.id,
            name=role.name,
            description=role.description,
        )
        db.add(db_role)
        db.commit()
        db.refresh(db_role)

        # Add permissions to role
        if role.permission_ids:
            for permission_id in role.permission_ids:
                permission = self.get_permission_by_id(db, permission_id)
                if permission:
                    db_role.permissions.append(permission)
            db.commit()
            db.refresh(db_role)

        return db_role

    def update_role(
        self, db: Session, role_id: str, role: RoleUpdate
    ) -> Optional[Role]:
        db_role = self.get_role_by_id(db, role_id)
        if not db_role:
            return None

        # Update basic fields
        for field, value in role.model_dump(
            exclude_unset=True, exclude={"permission_ids"}
        ).items():
            setattr(db_role, field, value)

        # Update permissions if provided
        if role.permission_ids is not None:
            db_role.permissions.clear()
            for permission_id in role.permission_ids:
                permission = self.get_permission_by_id(db, permission_id)
                if permission:
                    db_role.permissions.append(permission)

        db.commit()
        db.refresh(db_role)
        return db_role

    def delete_role(self, db: Session, role_id: str) -> bool:
        db_role = self.get_role_by_id(db, role_id)
        if not db_role:
            return False

        db.delete(db_role)
        db.commit()
        return True

    def get_user_permissions(self, db: Session, user: User) -> List[str]:
        """Get all permission names for a user (from role and direct permissions)"""
        permissions = set()

        # Get permissions from role
        if user.role_obj and user.role_obj.permissions:
            for permission in user.role_obj.permissions:
                permissions.add(permission.name)

        # Get direct permissions
        if user.user_permissions:
            for permission in user.user_permissions:
                permissions.add(permission.name)

        return list(permissions)

    def get_user_roles(self, db: Session, user: User) -> List[str]:
        """Get all role names for a user"""
        roles = []

        # Add the main role
        if user.role:
            roles.append(user.role)

        # Add role from relationship
        if user.role_obj:
            roles.append(user.role_obj.name)

        return list(set(roles))  # Remove duplicates

    def user_has_permission(
        self, db: Session, user: User, permission_name: str
    ) -> bool:
        """Check if user has a specific permission"""
        user_permissions = self.get_user_permissions(db, user)
        return permission_name in user_permissions

    def user_has_role(self, db: Session, user: User, role_name: str) -> bool:
        """Check if user has a specific role"""
        user_roles = self.get_user_roles(db, user)
        return role_name in user_roles


def get_permission_service() -> PermissionService:
    return PermissionService()
