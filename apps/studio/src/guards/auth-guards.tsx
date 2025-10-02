/**
 * Authentication Guards
 * Route protection components for the application
 */

import React, { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/auth-context"

interface AuthRouteProps {
  children: ReactNode
  requiredPermission?: string
  requiredRoles?: string[]
}

export const AuthRoute: React.FC<AuthRouteProps> = ({
  children,
  requiredPermission,
  requiredRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check required roles
  if (requiredRoles && user) {
    const userRoles = user.roles || []
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role)
    )
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />
    }
  }

  // Check required permissions
  if (requiredPermission && user) {
    const userPermissions = user.permissions || []
    const hasRequiredPermission = userPermissions.includes(requiredPermission)
    if (!hasRequiredPermission) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

// Hook for checking authentication conditions
export const useAuthCondition = () => {
  const { isAuthenticated, isLoading, user } = useAuth()

  const hasRole = (role: string) => {
    if (!user) return false
    const userRoles = user.roles || []
    return userRoles.includes(role)
  }

  const hasPermission = (permission: string) => {
    if (!user) return false
    const userPermissions = user.permissions || []
    return userPermissions.includes(permission)
  }

  const hasAnyRole = (roles: string[]) => {
    if (!user) return false
    const userRoles = user.roles || []
    return roles.some((role) => userRoles.includes(role))
  }

  const hasAnyPermission = (permissions: string[]) => {
    if (!user) return false
    const userPermissions = user.permissions || []
    return permissions.some((permission) =>
      userPermissions.includes(permission)
    )
  }

  const canAccess = (requiredPermission?: string, requiredRoles?: string[]) => {
    if (!isAuthenticated || !user) return false

    // If no requirements, allow access
    if (!requiredPermission && !requiredRoles) return true

    // Check permission
    if (requiredPermission && !hasPermission(requiredPermission)) return false

    // Check roles
    if (requiredRoles && !hasAnyRole(requiredRoles)) return false

    return true
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    canAccess,
  }
}
