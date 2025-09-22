import { useState, useCallback, useEffect, useMemo } from "react"
import { useServices } from "@/services/ServiceProvider"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { Task } from "@vailabel/core"

export interface TaskStats {
  total: number
  completed: number
  inProgress: number
  pending: number
  blocked: number
}

export interface TaskFilters {
  searchQuery: string
  statusFilter: string
  projectFilter: string
  activeTab: string
}

export interface TaskPageState {
  // Data
  tasks: Task[]
  projects: Array<{ id: string; name: string; [key: string]: unknown }>
  availableUsers: Array<{ id: string; name: string; email?: string }>
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Filters
  filters: TaskFilters
  
  // View Mode
  viewMode: "list" | "kanban"
  
  // Dialog States
  isDialogOpen: boolean
  editingTask: Task | null
  isDetailDialogOpen: boolean
  detailTask: Task | null
  
  // Computed Data
  filteredTasks: Task[]
  taskStats: TaskStats
}

export interface TaskPageActions {
  // Data Operations
  loadTasks: () => Promise<void>
  loadProjects: () => Promise<void>
  loadUsers: () => Promise<void>
  refreshData: () => Promise<void>
  
  // Task Operations
  createTask: (task: Task) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: string) => Promise<void>
  assignTask: (taskId: string, assignee?: string) => Promise<void>
  
  // Filter Operations
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setProjectFilter: (projectId: string) => void
  setActiveTab: (tab: string) => void
  clearFilters: () => void
  
  // View Operations
  setViewMode: (mode: "list" | "kanban") => void
  
  // Dialog Operations
  openCreateDialog: () => void
  openEditDialog: (task: Task) => void
  closeDialog: () => void
  openDetailDialog: (task: Task) => void
  closeDetailDialog: () => void
  
  // Task Actions
  handleSaveTask: (taskData: Omit<Task, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<void>
  handleDeleteTask: (taskId: string) => Promise<void>
  handleStatusChange: (taskId: string, status: string) => Promise<void>
  handleAssignTask: (taskId: string, assignee?: string) => Promise<void>
  
  // Computed Values
  hasTasks: boolean
  isEmpty: boolean
  isLoadingData: boolean
}

export function useTaskPageViewModel(): TaskPageState & TaskPageActions {
  const services = useServices()
  const { toast } = useToast()
  const confirm = useConfirmDialog()

  // State
  const [state, setState] = useState<TaskPageState>({
    tasks: [],
    projects: [],
    availableUsers: [],
    isLoading: false,
    error: null,
    filters: {
      searchQuery: "",
      statusFilter: "all",
      projectFilter: "all",
      activeTab: "all",
    },
    viewMode: "list",
    isDialogOpen: false,
    editingTask: null,
    isDetailDialogOpen: false,
    detailTask: null,
    filteredTasks: [],
    taskStats: {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      blocked: 0,
    },
  })

  // Data Operations
  const loadTasks = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const fetchedTasks = await services.getTaskService().getAllTasks()
      setState(prev => ({ ...prev, tasks: fetchedTasks }))
    } catch (error) {
      const errorMessage = "Failed to fetch tasks"
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error("Failed to fetch tasks:", error)
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [services, toast])

  const loadProjects = useCallback(async () => {
    try {
      const fetchedProjects = await services.getProjectService().getProjects()
      setState(prev => ({ ...prev, projects: fetchedProjects as Array<{ id: string; name: string; [key: string]: unknown }> }))
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    }
  }, [services])

  const loadUsers = useCallback(async () => {
    try {
      const fetchedUsers = await services.getUserService().getUsers()
      setState(prev => ({ 
        ...prev, 
        availableUsers: fetchedUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email
        }))
      }))
    } catch (error) {
      console.error("Failed to fetch users:", error)
      // Fallback to empty array if user loading fails
      setState(prev => ({ ...prev, availableUsers: [] }))
    }
  }, [services])

  const refreshData = useCallback(async () => {
    await Promise.all([loadTasks(), loadProjects(), loadUsers()])
  }, [loadTasks, loadProjects, loadUsers])

  // Task Operations
  const createTask = useCallback(async (task: Task) => {
    try {
      await services.getTaskService().createTask(task)
      await loadTasks()
      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      })
    }
  }, [services, loadTasks, toast])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await services.getTaskService().updateTask(taskId, updates)
      await loadTasks()
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    }
  }, [services, loadTasks, toast])

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await services.getTaskService().deleteTask(taskId)
      await loadTasks()
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    }
  }, [services, loadTasks, toast])

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    await updateTask(taskId, { status: status as Task['status'] })
  }, [updateTask])

  const assignTask = useCallback(async (taskId: string, assignee?: string) => {
    try {
      const taskToUpdate = state.tasks.find((t) => t.id === taskId)
      if (taskToUpdate) {
        await updateTask(taskId, {
          ...taskToUpdate,
          assignedTo: assignee || undefined,
        })
        toast({
          title: "Success",
          description: assignee
            ? `Task assigned to ${assignee}`
            : "Task unassigned",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      })
    }
  }, [state.tasks, updateTask, toast])

  // Filter Operations
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, searchQuery: query }
    }))
  }, [])

  const setStatusFilter = useCallback((status: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, statusFilter: status }
    }))
  }, [])

  const setProjectFilter = useCallback((projectId: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, projectFilter: projectId }
    }))
  }, [])

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, activeTab: tab }
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {
        searchQuery: "",
        statusFilter: "all",
        projectFilter: "all",
        activeTab: "all",
      }
    }))
  }, [])

  // View Operations
  const setViewMode = useCallback((mode: "list" | "kanban") => {
    setState(prev => ({ ...prev, viewMode: mode }))
  }, [])

  // Dialog Operations
  const openCreateDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDialogOpen: true,
      editingTask: null
    }))
  }, [])

  const openEditDialog = useCallback((task: Task) => {
    setState(prev => ({
      ...prev,
      isDialogOpen: true,
      editingTask: task
    }))
  }, [])

  const closeDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDialogOpen: false,
      editingTask: null
    }))
  }, [])

  const openDetailDialog = useCallback((task: Task) => {
    setState(prev => ({
      ...prev,
      isDetailDialogOpen: true,
      detailTask: task
    }))
  }, [])

  const closeDetailDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDetailDialogOpen: false,
      detailTask: null
    }))
  }, [])

  // Task Actions
  const handleSaveTask = useCallback(async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ) => {
    try {
      if (taskData.id) {
        await updateTask(taskData.id, taskData)
      } else {
        const newTask: Task = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await createTask(newTask)
      }
    } catch {
      toast({
        title: "Error",
        description: taskData.id
          ? "Failed to update task"
          : "Failed to create task",
        variant: "destructive",
      })
    }
  }, [updateTask, createTask, toast])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId)
    const confirmed = await confirm({
      title: "Delete Task",
      description: `Are you sure you want to delete "${task?.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      await deleteTask(taskId)
    }
  }, [state.tasks, confirm, deleteTask])

  const handleStatusChange = useCallback(async (taskId: string, status: string) => {
    try {
      await updateTaskStatus(taskId, status)
      toast({
        title: "Success",
        description: `Task status updated to ${status}`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
    }
  }, [updateTaskStatus, toast])

  const handleAssignTask = useCallback(async (taskId: string, assignee?: string) => {
    if (assignee !== undefined) {
      await assignTask(taskId, assignee)
    } else {
      const task = state.tasks.find((t) => t.id === taskId)
      if (task) {
        openEditDialog(task)
      }
    }
  }, [assignTask, state.tasks, openEditDialog])

  // Computed Values
  const filteredTasks = useMemo(() => {
    let filtered = state.tasks

    // Search filter
    if (state.filters.searchQuery) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(state.filters.searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(state.filters.searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (state.filters.statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === state.filters.statusFilter)
    }

    // Project filter
    if (state.filters.projectFilter !== "all") {
      filtered = filtered.filter((task) => task.projectId === state.filters.projectFilter)
    }

    // Tab filter
    if (state.filters.activeTab !== "all") {
      filtered = filtered.filter((task) => task.status === state.filters.activeTab)
    }

    return filtered
  }, [state.tasks, state.filters])

  const taskStats = useMemo(() => {
    const total = state.tasks.length
    const completed = state.tasks.filter(task => task.status === "completed").length
    const inProgress = state.tasks.filter(task => task.status === "in-progress").length
    const pending = state.tasks.filter(task => task.status === "pending").length
    const blocked = state.tasks.filter(task => task.status === "blocked").length

    return { total, completed, inProgress, pending, blocked }
  }, [state.tasks])

  const hasTasks = state.tasks.length > 0
  const isEmpty = !hasTasks && !state.isLoading
  const isLoadingData = state.isLoading

  // Persist settings
  useEffect(() => {
    services.getSettingsService().saveOrUpdateSetting("task-page-active-tab", state.filters.activeTab)
  }, [state.filters.activeTab, services])

  useEffect(() => {
    services.getSettingsService().saveOrUpdateSetting("task-page-view-mode", state.viewMode)
  }, [state.viewMode, services])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadProjects(), loadUsers()])
    }
    loadData()
  }, [loadProjects, loadUsers])

  useEffect(() => {
    if (state.projects.length > 0) {
      loadTasks()
    } else {
      // Load sample tasks if no projects
      loadTasks()
    }
  }, [state.projects, loadTasks])

  return {
    ...state,
    filteredTasks,
    taskStats,
    loadTasks,
    loadProjects,
    loadUsers,
    refreshData,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    assignTask,
    setSearchQuery,
    setStatusFilter,
    setProjectFilter,
    setActiveTab,
    clearFilters,
    setViewMode,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    openDetailDialog,
    closeDetailDialog,
    handleSaveTask,
    handleDeleteTask,
    handleStatusChange,
    handleAssignTask,
    hasTasks,
    isEmpty,
    isLoadingData,
  }
}
