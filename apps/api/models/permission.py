from pydantic import Field
from models.base import CamelModel
from typing import List, Optional
from datetime import datetime


class PermissionBase(CamelModel):
    name: str = Field(
        ..., min_length=1, description="Permission name must not be empty."
    )
    description: Optional[str] = None
    resource: str = Field(..., min_length=1, description="Resource must not be empty.")
    action: str = Field(..., min_length=1, description="Action must not be empty.")


class PermissionCreate(PermissionBase):
    id: str = Field(..., description="Permission ID must be a valid UUID.")


class PermissionUpdate(PermissionBase):
    pass


class Permission(PermissionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RoleBase(CamelModel):
    name: str = Field(..., min_length=1, description="Role name must not be empty.")
    description: Optional[str] = None


class RoleCreate(RoleBase):
    id: str = Field(..., description="Role ID must be a valid UUID.")
    permission_ids: Optional[List[str]] = []


class RoleUpdate(RoleBase):
    permission_ids: Optional[List[str]] = []


class Role(RoleBase):
    id: str
    created_at: datetime
    updated_at: datetime
    permissions: Optional[List[Permission]] = []

    model_config = {"from_attributes": True}
