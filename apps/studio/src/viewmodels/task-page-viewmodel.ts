import { useEffect, useMemo, useState } from "react"
import { Project, Task } from "@vailabel/core"
import { services } from "@/services"

type TaskFormInput = Omit<Task, "id" | "createdAt" | "updatedAt"> & { id?: string }

export const useTaskPageViewModel = (projectId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState(projectId ?? "all")
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">(
    "list"
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  const refreshData = async () => {
    setIsLoadingData(true)
    setError(null)
    try {
      const [nextProjects, nextTasks] = await Promise.all([
        services.getProjectService().list(),
        projectId
          ? services.getTaskService().listByProjectId(projectId)
          : services.getTaskService().list(),
      ])
      setProjects(nextProjects)
      setTasks(nextTasks)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [projectId])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchQuery.toLowerCase()
      const matchesQuery =
        !query ||
        task.name.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignedTo?.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === "all" || task.status === normalizeStatus(statusFilter)
      const matchesProject =
        projectFilter === "all" ||
        task.projectId === projectFilter ||
        task.project_id === projectFilter
      return matchesQuery && matchesStatus && matchesProject
    })
  }, [tasks, searchQuery, statusFilter, projectFilter])

  const saveTask = async (taskInput: TaskFormInput) => {
    const payload = {
      ...taskInput,
      projectId: taskInput.projectId,
      project_id: taskInput.projectId,
      dueDate: taskInput.dueDate,
      due_date: taskInput.dueDate,
      assignedTo: taskInput.assignedTo,
      assigned_to: taskInput.assignedTo,
    }

    if (taskInput.id) {
      const updatedTask = await services
        .getTaskService()
        .update(taskInput.id, payload)
      setTasks((current) =>
        current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      )
    } else {
      const createdTask = await services.getTaskService().create(payload)
      setTasks((current) => [createdTask, ...current])
    }

    setIsDialogOpen(false)
    setEditingTask(null)
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    const updatedTask = await services
      .getTaskService()
      .update(taskId, { status: normalizeStatus(status) })
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? updatedTask : task))
    )
  }

  const deleteTask = async (taskId: string) => {
    await services.getTaskService().delete(taskId)
    setTasks((current) => current.filter((task) => task.id !== taskId))
  }

  const taskStats = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "pending").length
    const inProgress = tasks.filter((task) => task.status === "in-progress").length
    const completed = tasks.filter((task) => task.status === "completed").length
    const blocked = tasks.filter((task) => task.status === "blocked").length
    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
      blocked,
    }
  }, [tasks])

  return {
    tasks,
    filteredTasks,
    projects,
    availableUsers: [],
    taskStats,
    viewMode,
    filters: {
      searchQuery,
      statusFilter,
      projectFilter,
      activeTab: statusFilter,
    },
    isLoading: isLoadingData,
    isLoadingData,
    error,
    isDialogOpen,
    isDetailDialogOpen,
    editingTask,
    detailTask,
    refreshData,
    setSearchQuery,
    setStatusFilter,
    setProjectFilter,
    setActiveTab: setStatusFilter,
    setViewMode,
    openCreateDialog: () => {
      setEditingTask(null)
      setIsDialogOpen(true)
    },
    openEditDialog: (task: Task) => {
      setEditingTask(task)
      setIsDialogOpen(true)
    },
    openDetailDialog: (task: Task) => {
      setDetailTask(task)
      setIsDetailDialogOpen(true)
    },
    closeDialog: () => {
      setIsDialogOpen(false)
      setEditingTask(null)
    },
    closeDetailDialog: () => {
      setIsDetailDialogOpen(false)
      setDetailTask(null)
    },
    handleSaveTask: saveTask,
    handleDeleteTask: deleteTask,
    handleStatusChange: updateTaskStatus,
    handleAssignTask: () => {},
  }
}

function normalizeStatus(status: string) {
  if (status === "in_progress") return "in-progress"
  return status
}
