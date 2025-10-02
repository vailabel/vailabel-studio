/**
 * Permission-based UI Guards
 * Components that conditionally render content based on user permissions
 */

import React, { ReactNode } from "react"
import { usePermissions } from "@/contexts/permission-context"

interface PermissionGuardProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  roles?: string[]
  requireAllRoles?: boolean
  fallback?: ReactNode
}

/**
 * Renders children only if user has the required permission(s) or role(s)
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  requireAllRoles = false,
  fallback = null,
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  } = usePermissions()

  let hasAccess = false

  // Check permissions
  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  // Check roles (if no permissions specified or permissions check passed)
  if (!hasAccess && (role || (roles && roles.length > 0))) {
    if (role) {
      hasAccess = hasRole(role)
    } else if (roles && roles.length > 0) {
      hasAccess = requireAllRoles
        ? roles.every((r) => hasRole(r))
        : hasAnyRole(roles)
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

interface ResourceGuardProps {
  children: ReactNode
  resource: string
  action: "read" | "write" | "delete" | "manage"
  fallback?: ReactNode
}

/**
 * Renders children only if user can perform the specified action on the resource
 */
export const ResourceGuard: React.FC<ResourceGuardProps> = ({
  children,
  resource,
  action,
  fallback = null,
}) => {
  const { canRead, canWrite, canDelete, canManage } = usePermissions()

  let hasAccess = false

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

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

interface RoleGuardProps {
  children: ReactNode
  role: string
  roles?: string[]
  requireAll?: boolean
  fallback?: ReactNode
}

/**
 * Renders children only if user has the required role(s)
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  role,
  roles,
  requireAll = false,
  fallback = null,
}) => {
  const { hasRole, hasAnyRole } = usePermissions()

  let hasAccess = false

  if (role) {
    hasAccess = hasRole(role)
  } else if (roles && roles.length > 0) {
    hasAccess = requireAll ? roles.every((r) => hasRole(r)) : hasAnyRole(roles)
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

interface AdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Renders children only if user is an admin
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallback = null,
}) => {
  return (
    <RoleGuard role="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

interface ManagerGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Renders children only if user is a manager or admin
 */
export const ManagerGuard: React.FC<ManagerGuardProps> = ({
  children,
  fallback = null,
}) => {
  return (
    <RoleGuard role="" roles={["admin", "manager"]} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  fallback?: ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

// Higher-order component for role-based rendering
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  role: string,
  fallback?: ReactNode
) {
  return function RoleWrappedComponent(props: P) {
    return (
      <RoleGuard role={role} fallback={fallback}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}
