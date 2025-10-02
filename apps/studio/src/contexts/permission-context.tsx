/**
 * Permission Context for RBAC (Role-Based Access Control)
 * Provides permission checking and management functionality
 */

import React, { createContext, useContext, ReactNode, useMemo } from "react"
import { useAuth } from "./auth-context"

interface PermissionContextType {
  // Permission checking
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean

  // Permission data
  userPermissions: string[]
  userRoles: string[]
  isLoading: boolean
  error: Error | null

  // Permission management helpers
  canRead: (resource: string) => boolean
  canWrite: (resource: string) => boolean
  canDelete: (resource: string) => boolean
  canManage: (resource: string) => boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
)

interface PermissionProviderProps {
  children: ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Extract user roles and permissions from user object
  const { userRoles, allPermissions } = useMemo(() => {
    if (!user) {
      return { userRoles: [], allPermissions: [] }
    }

    const roles: string[] = []
    const permissions: string[] = []

    // Add main role
    if (user.role) {
      roles.push(user.role)
    }

    // Add roles from roles array
    if (user.roles) {
      roles.push(...user.roles)
    }

    // Add permissions from permissions array (from /auth/me endpoint)
    if (user.permissions) {
      permissions.push(...user.permissions)
    }

    // Add permissions from role object (if available)
    if ((user as any).roleObj?.permissions) {
      permissions.push(
        ...(user as any).roleObj.permissions.map((p: any) => p.name)
      )
    }

    // Add permissions from user permissions (if available)
    if ((user as any).userPermissions) {
      permissions.push(...(user as any).userPermissions.map((p: any) => p.name))
    }

    return {
      userRoles: [...new Set(roles)], // Remove duplicates
      allPermissions: [...new Set(permissions)], // Remove duplicates
    }
  }, [user])

  // Permission checking functions
  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false
    return allPermissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false
    return permissions.some((permission) => allPermissions.includes(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false
    return permissions.every((permission) =>
      allPermissions.includes(permission)
    )
  }

  const hasRole = (role: string): boolean => {
    if (!isAuthenticated || !user) return false
    return userRoles.includes(role)
  }

  const hasAnyRole = (roles: string[]): boolean => {
    if (!isAuthenticated || !user) return false
    return roles.some((role) => userRoles.includes(role))
  }

  // Resource-based permission helpers
  const canRead = (resource: string): boolean => {
    return hasPermission(`${resource}:read`)
  }

  const canWrite = (resource: string): boolean => {
    return hasPermission(`${resource}:write`)
  }

  const canDelete = (resource: string): boolean => {
    return hasPermission(`${resource}:delete`)
  }

  const canManage = (resource: string): boolean => {
    return hasAnyPermission([
      `${resource}:read`,
      `${resource}:write`,
      `${resource}:delete`,
    ])
  }

  const value: PermissionContextType = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    userPermissions: allPermissions,
    userRoles,
    isLoading,
    error: null,
    canRead,
    canWrite,
    canDelete,
    canManage,
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider")
  }
  return context
}

// Convenience hooks for common permission checks
export const useCanRead = (resource: string) => {
  const { canRead } = usePermissions()
  return canRead(resource)
}

export const useCanWrite = (resource: string) => {
  const { canWrite } = usePermissions()
  return canWrite(resource)
}

export const useCanDelete = (resource: string) => {
  const { canDelete } = usePermissions()
  return canDelete(resource)
}

export const useCanManage = (resource: string) => {
  const { canManage } = usePermissions()
  return canManage(resource)
}

export const useHasPermission = (permission: string) => {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

export const useHasRole = (role: string) => {
  const { hasRole } = usePermissions()
  return hasRole(role)
}
