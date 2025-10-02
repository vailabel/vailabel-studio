from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.permission_service import PermissionService, get_permission_service
from models.permission import (
    Permission,
    PermissionCreate,
    PermissionUpdate,
    Role,
    RoleCreate,
    RoleUpdate,
)
from api.v1.auth import require_permission
from services.auth_service import get_current_active_user
from db.models.user import User

router = APIRouter(prefix="/api/v1/permissions", tags=["Permissions"])


# Permission endpoints
@router.get("/", response_model=list[Permission])
def list_permissions(
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: User = Depends(require_permission("permissions:read")),
):
    return service.get_permissions(db)


@router.get("/{permission_id}", response_model=Permission)
def get_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: User = Depends(require_permission("permissions:read")),
):
    permission = service.get_permission_by_id(db, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    return permission


@router.post("/", response_model=Permission)
def create_permission(
    permission: PermissionCreate,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: None = Depends(require_permission("permissions:write")),
):
    return service.create_permission(db, permission)


@router.put("/{permission_id}", response_model=Permission)
def update_permission(
    permission_id: str,
    permission: PermissionUpdate,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: None = Depends(require_permission("permissions:write")),
):
    updated = service.update_permission(db, permission_id, permission)
    if not updated:
        raise HTTPException(status_code=404, detail="Permission not found")
    return updated


@router.delete("/{permission_id}")
def delete_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: None = Depends(require_permission("permissions:write")),
):
    deleted = service.delete_permission(db, permission_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Permission not found")
    return {"message": "Permission deleted"}


# Role endpoints
@router.get("/roles/", response_model=list[Role])
def list_roles(
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: User = Depends(require_permission("roles:read")),
):
    return service.get_roles(db)


@router.get("/roles/{role_id}", response_model=Role)
def get_role(
    role_id: str,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: User = Depends(require_permission("roles:read")),
):
    role = service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.post("/roles/", response_model=Role)
def create_role(
    role: RoleCreate,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: None = Depends(require_permission("roles:write")),
):
    return service.create_role(db, role)


@router.put("/roles/{role_id}", response_model=Role)
def update_role(
    role_id: str,
    role: RoleUpdate,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: None = Depends(require_permission("roles:write")),
):
    updated = service.update_role(db, role_id, role)
    if not updated:
        raise HTTPException(status_code=404, detail="Role not found")
    return updated


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    db: Session = Depends(get_db),
    service: PermissionService = Depends(get_permission_service),
    _: None = Depends(require_permission("roles:write")),
):
    deleted = service.delete_role(db, role_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted"}
