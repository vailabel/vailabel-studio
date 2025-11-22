/**
 * Permission Management Hooks
 * Custom hooks for managing permissions and roles
 */

import { useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  usePermissions as usePermissionsQuery,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from "./api/permission-hooks"
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from "./api/role-hooks"
import {
  useAssignUserPermissions,
  useAssignUserRole,
} from "./api/user-permission-hooks"
import { usePermissions } from "@/contexts/permission-context"

// Permission management hook
export const usePermissionManagement = () => {
  const { toast } = useToast()
  const createPermissionMutation = useCreatePermission()
  const updatePermissionMutation = useUpdatePermission()
  const deletePermissionMutation = useDeletePermission()

  const createPermission = useCallback(
    async (permission: any) => {
      try {
        await createPermissionMutation.mutateAsync(permission)
        toast({
          title: "Success",
          description: "Permission created successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create permission",
          variant: "destructive",
        })
        throw error
      }
    },
    [createPermissionMutation, toast]
  )

  const updatePermission = useCallback(
    async (id: string, updates: any) => {
      try {
        await updatePermissionMutation.mutateAsync({ id, updates })
        toast({
          title: "Success",
          description: "Permission updated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update permission",
          variant: "destructive",
        })
        throw error
      }
    },
    [updatePermissionMutation, toast]
  )

  const deletePermission = useCallback(
    async (id: string) => {
      try {
        await deletePermissionMutation.mutateAsync(id)
        toast({
          title: "Success",
          description: "Permission deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete permission",
          variant: "destructive",
        })
        throw error
      }
    },
    [deletePermissionMutation, toast]
  )

  return {
    createPermission,
    updatePermission,
    deletePermission,
    isLoading:
      createPermissionMutation.isLoading ||
      updatePermissionMutation.isLoading ||
      deletePermissionMutation.isLoading,
  }
}

// Role management hook
export const useRoleManagement = () => {
  const { toast } = useToast()
  const createRoleMutation = useCreateRole()
  const updateRoleMutation = useUpdateRole()
  const deleteRoleMutation = useDeleteRole()

  const createRole = useCallback(
    async (role: any) => {
      try {
        await createRoleMutation.mutateAsync(role)
        toast({
          title: "Success",
          description: "Role created successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create role",
          variant: "destructive",
        })
        throw error
      }
    },
    [createRoleMutation, toast]
  )

  const updateRole = useCallback(
    async (id: string, updates: any) => {
      try {
        await updateRoleMutation.mutateAsync({ id, updates })
        toast({
          title: "Success",
          description: "Role updated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update role",
          variant: "destructive",
        })
        throw error
      }
    },
    [updateRoleMutation, toast]
  )

  const deleteRole = useCallback(
    async (id: string) => {
      try {
        await deleteRoleMutation.mutateAsync(id)
        toast({
          title: "Success",
          description: "Role deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete role",
          variant: "destructive",
        })
        throw error
      }
    },
    [deleteRoleMutation, toast]
  )

  return {
    createRole,
    updateRole,
    deleteRole,
    isLoading:
      createRoleMutation.isLoading ||
      updateRoleMutation.isLoading ||
      deleteRoleMutation.isLoading,
  }
}

// User permission management hook
export const useUserPermissionManagement = () => {
  const { toast } = useToast()
  const assignPermissionsMutation = useAssignUserPermissions()
  const assignRoleMutation = useAssignUserRole()

  const assignPermissions = useCallback(
    async (userId: string, permissionIds: string[]) => {
      try {
        await assignPermissionsMutation.mutateAsync({ userId, permissionIds })
        toast({
          title: "Success",
          description: "User permissions updated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update user permissions",
          variant: "destructive",
        })
        throw error
      }
    },
    [assignPermissionsMutation, toast]
  )

  const assignRole = useCallback(
    async (userId: string, roleId: string) => {
      try {
        await assignRoleMutation.mutateAsync({ userId, roleId })
        toast({
          title: "Success",
          description: "User role updated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update user role",
          variant: "destructive",
        })
        throw error
      }
    },
    [assignRoleMutation, toast]
  )

  return {
    assignPermissions,
    assignRole,
    isLoading:
      assignPermissionsMutation.isLoading || assignRoleMutation.isLoading,
  }
}

// Permission validation hook
export const usePermissionValidation = () => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  } = usePermissions()

  const validatePermission = useCallback(
    (permission: string): boolean => {
      return hasPermission(permission)
    },
    [hasPermission]
  )

  const validateAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      return hasAnyPermission(permissions)
    },
    [hasAnyPermission]
  )

  const validateAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      return hasAllPermissions(permissions)
    },
    [hasAllPermissions]
  )

  const validateRole = useCallback(
    (role: string): boolean => {
      return hasRole(role)
    },
    [hasRole]
  )

  const validateAnyRole = useCallback(
    (roles: string[]): boolean => {
      return hasAnyRole(roles)
    },
    [hasAnyRole]
  )

  return {
    validatePermission,
    validateAnyPermission,
    validateAllPermissions,
    validateRole,
    validateAnyRole,
  }
}

// Permission analytics hook
export const usePermissionAnalytics = () => {
  const { data: permissions = [] } = usePermissionsQuery()
  const { data: roles = [] } = useRoles()

  const getPermissionStats = useCallback(() => {
    const resourceStats = permissions.reduce(
      (acc, permission) => {
        const resource = permission.resource
        if (!acc[resource]) {
          acc[resource] = { read: 0, write: 0, delete: 0, total: 0 }
        }
        acc[resource][permission.action]++
        acc[resource].total++
        return acc
      },
      {} as Record<
        string,
        { read: number; write: number; delete: number; total: number }
      >
    )

    return {
      totalPermissions: permissions.length,
      totalRoles: roles.length,
      resourceStats,
      mostCommonResource: Object.keys(resourceStats).reduce(
        (a, b) => (resourceStats[a].total > resourceStats[b].total ? a : b),
        ""
      ),
    }
  }, [permissions, roles])

  return {
    getPermissionStats,
    permissions,
    roles,
  }
}
