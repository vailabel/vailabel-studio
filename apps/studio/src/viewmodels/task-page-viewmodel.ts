/**
 * Task Page ViewModel
 * Manages task page state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "react-query"
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/api/task-hooks"
import { Task } from "@vailabel/core"

export const useTaskPageViewModel = (projectId?: string) => {
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<
    "title" | "createdAt" | "dueDate" | "status" | "priority"
  >("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">(
    "list"
  )

  // Queries
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useTasks(projectId || "")

  // Mutations
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

  // Computed values
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.assignee?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((task) => task.status === filterStatus)
    }

    // Filter by priority
    if (filterPriority !== "all") {
      filtered = filtered.filter((task) => task.priority === filterPriority)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "createdAt":
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case "dueDate":
          aValue = a.dueDate ? new Date(a.dueDate) : new Date(0)
          bValue = b.dueDate ? new Date(b.dueDate) : new Date(0)
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [tasks, searchQuery, sortBy, sortOrder, filterStatus, filterPriority])

  const selectedTasksData = useMemo(() => {
    return tasks.filter((task) => selectedTasks.includes(task.id))
  }, [tasks, selectedTasks])

  const taskStatuses = useMemo(() => {
    const statuses = new Set(tasks.map((task) => task.status))
    return Array.from(statuses)
  }, [tasks])

  const taskPriorities = useMemo(() => {
    const priorities = new Set(tasks.map((task) => task.priority))
    return Array.from(priorities)
  }, [tasks])

  const taskStats = useMemo(() => {
    const total = tasks.length
    const todo = tasks.filter((t) => t.status === "todo").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    const completed = tasks.filter((t) => t.status === "completed").length
    const overdue = tasks.filter((t) => {
      if (!t.dueDate) return false
      return new Date(t.dueDate) < new Date() && t.status !== "completed"
    }).length

    const highPriority = tasks.filter((t) => t.priority === "high").length
    const mediumPriority = tasks.filter((t) => t.priority === "medium").length
    const lowPriority = tasks.filter((t) => t.priority === "low").length

    return {
      total,
      todo,
      inProgress,
      completed,
      overdue,
      highPriority,
      mediumPriority,
      lowPriority,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [tasks])

  const kanbanColumns = useMemo(() => {
    const columns = [
      {
        id: "todo",
        title: "To Do",
        tasks: tasks.filter((t) => t.status === "todo"),
      },
      {
        id: "in_progress",
        title: "In Progress",
        tasks: tasks.filter((t) => t.status === "in_progress"),
      },
      {
        id: "completed",
        title: "Completed",
        tasks: tasks.filter((t) => t.status === "completed"),
      },
    ]
    return columns
  }, [tasks])

  // Actions
  const updateSearchQuery = (query: string) => {
    setSearchQuery(query)
  }

  const updateSorting = (
    by: "title" | "createdAt" | "dueDate" | "status" | "priority",
    order: "asc" | "desc"
  ) => {
    setSortBy(by)
    setSortOrder(order)
  }

  const updateFilterStatus = (status: string) => {
    setFilterStatus(status)
  }

  const updateFilterPriority = (priority: string) => {
    setFilterPriority(priority)
  }

  const changeViewMode = (mode: "list" | "kanban" | "calendar") => {
    setViewMode(mode)
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    )
  }

  const selectAllTasks = () => {
    setSelectedTasks(filteredAndSortedTasks.map((task) => task.id))
  }

  const clearSelection = () => {
    setSelectedTasks([])
  }

  const createTask = async (taskData: Omit<Task, "id">) => {
    try {
      const result = await createTaskMutation.mutateAsync(taskData)
      return result
    } catch (error) {
      console.error("Failed to create task:", error)
      throw error
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        updates,
      })
    } catch (error) {
      console.error("Failed to update task:", error)
      throw error
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId)
      // Remove from selection if it was selected
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId))
    } catch (error) {
      console.error("Failed to delete task:", error)
      throw error
    }
  }

  const deleteSelectedTasks = async () => {
    try {
      const promises = selectedTasks.map((taskId) =>
        deleteTaskMutation.mutateAsync(taskId)
      )
      await Promise.all(promises)
      clearSelection()
    } catch (error) {
      console.error("Failed to delete selected tasks:", error)
      throw error
    }
  }

  const markTaskComplete = async (taskId: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        updates: { status: "completed" },
      })
    } catch (error) {
      console.error("Failed to mark task complete:", error)
      throw error
    }
  }

  const markTaskInProgress = async (taskId: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        updates: { status: "in_progress" },
      })
    } catch (error) {
      console.error("Failed to mark task in progress:", error)
      throw error
    }
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        updates: { status },
      })
    } catch (error) {
      console.error("Failed to update task status:", error)
      throw error
    }
  }

  const updateTaskPriority = async (taskId: string, priority: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        updates: { priority },
      })
    } catch (error) {
      console.error("Failed to update task priority:", error)
      throw error
    }
  }

  const exportTasks = () => {
    const exportData = {
      tasks: selectedTasksData.length > 0 ? selectedTasksData : tasks,
      exportedAt: new Date().toISOString(),
      projectId,
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tasks-export.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  const refreshTasks = () => {
    refetch()
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "gray"
      case "in_progress":
        return "blue"
      case "completed":
        return "green"
      case "cancelled":
        return "red"
      default:
        return "gray"
    }
  }

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "red"
      case "medium":
        return "yellow"
      case "low":
        return "green"
      default:
        return "gray"
    }
  }

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false
    return new Date(task.dueDate) < new Date() && task.status !== "completed"
  }

  return {
    // State
    tasks: filteredAndSortedTasks,
    allTasks: tasks,
    filteredTasks: filteredAndSortedTasks,
    selectedTasks,
    selectedTasksData,
    searchQuery,
    sortBy,
    sortOrder,
    filterStatus,
    filterPriority,
    viewMode,
    taskStatuses,
    taskPriorities,
    taskStats,
    kanbanColumns,
    isLoading,
    isLoadingData: isLoading,
    error,

    // Filters object for compatibility with TaskPage
    filters: {
      searchQuery,
      statusFilter: filterStatus,
      projectFilter: "all", // TODO: Implement project filtering
      activeTab: filterStatus,
    },

    // Mock data for compatibility
    projects: [], // TODO: Add projects query
    availableUsers: [], // TODO: Add users query

    // Dialog state
    isDialogOpen: false,
    isDetailDialogOpen: false,
    editingTask: null,
    detailTask: null,

    // Actions
    updateSearchQuery,
    setSearchQuery: updateSearchQuery,
    updateSorting,
    updateFilterStatus,
    setStatusFilter: updateFilterStatus,
    setProjectFilter: () => {}, // TODO: Implement
    updateFilterPriority,
    changeViewMode,
    setViewMode: changeViewMode,
    setActiveTab: updateFilterStatus,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    createTask,
    updateTask,
    deleteTask,
    deleteSelectedTasks,
    markTaskComplete,
    markTaskInProgress,
    updateTaskStatus,
    updateTaskPriority,
    exportTasks,
    refreshTasks,
    refreshData: refreshTasks,
    getTaskStatusColor,
    getTaskPriorityColor,
    isTaskOverdue,

    // Dialog actions
    openCreateDialog: () => {},
    openEditDialog: () => {},
    openDetailDialog: () => {},
    closeDialog: () => {},
    closeDetailDialog: () => {},

    // Task actions
    handleSaveTask: () => {},
    handleDeleteTask: () => {},
    handleStatusChange: () => {},
    handleAssignTask: () => {},

    // Mutation state
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  }
}
