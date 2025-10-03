/**
 * User ViewModel
 * Manages user state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "react-query"
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useRoles,
} from "@/hooks/useFastAPIQuery"
import { User } from "@vailabel/core"

export const useUserViewModel = () => {
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Queries
  const { data: users = [], isLoading, error, refetch } = useUsers()
  const { data: roles = [] } = useRoles()

  // Mutations
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  // Computed values
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    return filtered
  }, [users, searchQuery, roleFilter])

  const userStats = useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.role === "admin").length
    const managers = users.filter((u) => u.role === "manager").length
    const reviewers = users.filter((u) => u.role === "reviewer").length
    const annotators = users.filter((u) => u.role === "annotator").length

    return { total, admins, managers, reviewers, annotators }
  }, [users])

  // Actions
  const updateSearchQuery = (query: string) => {
    setSearchQuery(query)
  }

  const updateRoleFilter = (filter: string) => {
    setRoleFilter(filter)
  }

  const openCreateDialog = () => {
    setEditingUser(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
  }

  const createUser = async (userData: Omit<User, "id">) => {
    try {
      await createUserMutation.mutateAsync(userData)
      return true
    } catch (error) {
      console.error("Failed to create user:", error)
      throw error
    }
  }

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, updates })
      return true
    } catch (error) {
      console.error("Failed to update user:", error)
      throw error
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId)
      return true
    } catch (error) {
      console.error("Failed to delete user:", error)
      throw error
    }
  }

  const refreshUsers = () => {
    refetch()
  }

  return {
    // State
    users: filteredUsers,
    allUsers: users,
    roles,
    searchQuery,
    roleFilter,
    isDialogOpen,
    editingUser,
    userStats,
    isLoading,
    error,

    // Actions
    updateSearchQuery,
    updateRoleFilter,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers,

    // Mutation state
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,
  }
}
