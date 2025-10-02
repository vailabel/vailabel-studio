/**
 * Permission-aware Button Component
 * Button that is disabled or hidden based on user permissions
 */

import React from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/contexts/permission-context"

interface PermissionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  roles?: string[]
  requireAllRoles?: boolean
  resource?: string
  action?: "read" | "write" | "delete" | "manage"
  hideWhenDisabled?: boolean
  disabledMessage?: string
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  requireAllRoles = false,
  resource,
  action,
  hideWhenDisabled = false,
  disabledMessage,
  disabled,
  onClick,
  ...props
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    canRead,
    canWrite,
    canDelete,
    canManage,
  } = usePermissions()

  let hasAccess = false

  // Check resource-based permissions
  if (resource && action) {
    switch (action) {
      case "read":
        hasAccess = canRead(resource)
        break
      case "write":
        hasAccess = canWrite(resource)
        break
      case "delete":
        hasAccess = canDelete(resource)
        break
      case "manage":
        hasAccess = canManage(resource)
        break
    }
  }
  // Check specific permissions
  else if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }
  // Check roles
  else if (role) {
    hasAccess = hasRole(role)
  } else if (roles && roles.length > 0) {
    hasAccess = requireAllRoles
      ? roles.every((r) => hasRole(r))
      : hasAnyRole(roles)
  }

  // If no permission requirements specified, allow access
  if (!permission && !permissions && !role && !roles && !resource) {
    hasAccess = true
  }

  const isDisabled = disabled || !hasAccess

  // Hide button if hideWhenDisabled is true and user doesn't have access
  if (hideWhenDisabled && !hasAccess) {
    return null
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && onClick) {
      onClick(e)
    }
  }

  return (
    <Button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      title={
        isDisabled && disabledMessage ? disabledMessage : (props as any).title
      }
    >
      {children}
    </Button>
  )
}

// Convenience components for common use cases
export const ReadButton: React.FC<
  Omit<PermissionButtonProps, "resource" | "action"> & { resource: string }
> = ({ resource, ...props }) => (
  <PermissionButton resource={resource} action="read" {...props} />
)

export const WriteButton: React.FC<
  Omit<PermissionButtonProps, "resource" | "action"> & { resource: string }
> = ({ resource, ...props }) => (
  <PermissionButton resource={resource} action="write" {...props} />
)

export const DeleteButton: React.FC<
  Omit<PermissionButtonProps, "resource" | "action"> & { resource: string }
> = ({ resource, ...props }) => (
  <PermissionButton resource={resource} action="delete" {...props} />
)

export const ManageButton: React.FC<
  Omit<PermissionButtonProps, "resource" | "action"> & { resource: string }
> = ({ resource, ...props }) => (
  <PermissionButton resource={resource} action="manage" {...props} />
)

export const AdminButton: React.FC<Omit<PermissionButtonProps, "role">> = (
  props
) => <PermissionButton role="admin" {...props} />

export const ManagerButton: React.FC<Omit<PermissionButtonProps, "roles">> = (
  props
) => <PermissionButton roles={["admin", "manager"]} {...props} />
