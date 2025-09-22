import React, { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { AuthUser } from "@/services/contracts/IAuthService"

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
}

interface PermissionGuardProps {
  children: ReactNode
  permission: string
  fallback?: ReactNode
  redirectTo?: string
}

interface RoleGuardProps {
  children: ReactNode
  roles: string[]
  fallback?: ReactNode
  redirectTo?: string
}

interface AuthRouteProps {
  children: ReactNode
  requireAuth?: boolean
  requiredPermission?: string
  requiredRoles?: string[]
  fallback?: ReactNode
}

// Higher-order component for authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean
    requiredPermission?: string
    requiredRoles?: string[]
    fallback?: ReactNode
  } = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, isInitialized, hasPermission, hasAnyRole } = useAuth()
    const location = useLocation()

    // Show loading while initializing
    if (!isInitialized || isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      )
    }

    // Check authentication requirement
    if (options.requireAuth !== false && !user) {
      return (
        <Navigate 
          to="/login" 
          state={{ from: location }} 
          replace 
        />
      )
    }

    // Check permission requirement
    if (options.requiredPermission && user) {
      if (!hasPermission(options.requiredPermission)) {
        return options.fallback || (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </div>
        )
      }
    }

    // Check role requirement
    if (options.requiredRoles && user) {
      if (!hasAnyRole(options.requiredRoles)) {
        return options.fallback || (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-600">You don't have the required role to access this page.</p>
            </div>
          </div>
        )
      }
    }

    return <Component {...props} />
  }
}

// Authentication guard component
export function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuth()
  const location = useLocation()

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    )
  }

  return <>{children}</>
}

// Permission guard component
export function PermissionGuard({ 
  children, 
  permission, 
  fallback, 
  redirectTo 
}: PermissionGuardProps) {
  const { user, hasPermission } = useAuth()

  if (!user) {
    return redirectTo ? (
      <Navigate to={redirectTo} replace />
    ) : (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Please log in to access this page.</div>
      </div>
    )
  }

  if (!hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this resource.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Role guard component
export function RoleGuard({ 
  children, 
  roles, 
  fallback, 
  redirectTo 
}: RoleGuardProps) {
  const { user, hasAnyRole } = useAuth()

  if (!user) {
    return redirectTo ? (
      <Navigate to={redirectTo} replace />
    ) : (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Please log in to access this page.</div>
      </div>
    )
  }

  if (!hasAnyRole(roles)) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have the required role to access this resource.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Flexible auth route component
export function AuthRoute({ 
  children, 
  requireAuth = true, 
  requiredPermission, 
  requiredRoles, 
  fallback 
}: AuthRouteProps) {
  const { user, isLoading, isInitialized, hasPermission, hasAnyRole } = useAuth()
  const location = useLocation()

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    )
  }

  // Check permission requirement
  if (requiredPermission && user && !hasPermission(requiredPermission)) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Check role requirement
  if (requiredRoles && user && !hasAnyRole(requiredRoles)) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have the required role to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for conditional rendering based on auth state
export function useAuthCondition() {
  const { user, isLoading, isInitialized, hasPermission, hasRole, hasAnyRole } = useAuth()

  return {
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    user,
    hasPermission,
    hasRole,
    hasAnyRole,
    canAccess: (permission?: string, roles?: string[]) => {
      if (!user) return false
      if (permission && !hasPermission(permission)) return false
      if (roles && !hasAnyRole(roles)) return false
      return true
    },
  }
}

// Utility function to check if user can access a resource
export function canAccessResource(
  user: AuthUser | null,
  permission?: string,
  roles?: string[]
): boolean {
  if (!user) return false
  
  if (permission && !user.permissions?.includes(permission)) return false
  if (roles && !roles.includes(user.role)) return false
  
  return true
}
