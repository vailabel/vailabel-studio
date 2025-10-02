import { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useServices } from "@/services/ServiceProvider"
import { useToast } from "@/hooks/use-toast"

export interface DashboardStatistics {
  totalProjects: number
  activeUsers: number
  labelsCreated: number
  totalAnnotations: number
  completedTasks: number
  pendingTasks: number
}

export interface RecentActivityItem {
  id: string
  activity: string
  user: string
  userAvatar?: string
  date: Date
  type: "project" | "annotation" | "label" | "user"
  projectId?: string
  projectName?: string
}

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  action: () => void
  color: string
  disabled?: boolean
}

export interface OverviewState {
  statistics: DashboardStatistics
  recentActivity: RecentActivityItem[]
  quickActions: QuickAction[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface OverviewActions {
  // Data operations
  loadDashboardData: () => Promise<void>
  refreshData: () => Promise<void>

  // Navigation
  navigateToProjects: () => void
  navigateToLabels: () => void
  navigateToUsers: () => void
  navigateToTasks: () => void

  // Activity operations
  // loadRecentActivity: () => Promise<void> // Removed - now integrated into loadDashboardData

  // Computed values
  hasData: boolean
  isEmpty: boolean
  statisticsLoaded: boolean
}

export function useOverviewViewModel(): OverviewState & OverviewActions {
  const navigate = useNavigate()
  const services = useServices()
  const { toast } = useToast()

  // State
  const [state, setState] = useState<OverviewState>({
    statistics: {
      totalProjects: 0,
      activeUsers: 0,
      labelsCreated: 0,
      totalAnnotations: 0,
      completedTasks: 0,
      pendingTasks: 0,
    },
    recentActivity: [],
    quickActions: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  })

  // Actions
  const loadDashboardData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const [projects, labels, users, annotations] = await Promise.all([
        services.getProjectService().getProjects(),
        services.getLabelService().getLabelsByProjectId(""), // Get all labels
        services.getUserService().getUsers(),
        services.getAnnotationService().getAnnotationsByProjectId(""), // Get all annotations
      ])

      // Mock task data for now
      const completedTasks = 0
      const pendingTasks = 0

      setState((prev) => ({
        ...prev,
        statistics: {
          totalProjects: projects.length,
          activeUsers: users.length,
          labelsCreated: labels.length,
          totalAnnotations: annotations.length,
          completedTasks,
          pendingTasks,
        },
        lastUpdated: new Date(),
      }))

      // Load recent activity after setting statistics
      const [projectsForActivity, usersForActivity] = await Promise.all([
        services.getProjectService().getProjects(),
        services.getUserService().getUsers(),
      ])

      const mockActivity: RecentActivityItem[] = [
        {
          id: "1",
          activity: "Created new project",
          user: usersForActivity[0]?.name || "System",
          userAvatar: undefined,
          date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          type: "project" as const,
          projectId: projectsForActivity[0]?.id,
          projectName: projectsForActivity[0]?.name,
        },
        {
          id: "2",
          activity: "Added new label",
          user: usersForActivity[1]?.name || "Admin",
          userAvatar: undefined,
          date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          type: "label" as const,
          projectId: projectsForActivity[1]?.id,
          projectName: projectsForActivity[1]?.name,
        },
        {
          id: "3",
          activity: "Completed annotation task",
          user: usersForActivity[2]?.name || "Annotator",
          userAvatar: undefined,
          date: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
          type: "annotation" as const,
          projectId: projectsForActivity[0]?.id,
          projectName: projectsForActivity[0]?.name,
        },
      ].filter(
        (item) => item.user !== "System" || projectsForActivity.length > 0
      )

      setState((prev) => ({ ...prev, recentActivity: mockActivity }))
    } catch (error) {
      const errorMessage = "Failed to load dashboard data"
      setState((prev) => ({ ...prev, error: errorMessage }))
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error("Failed to load dashboard data:", error)
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [services, toast])

  const refreshData = useCallback(async () => {
    await loadDashboardData()
  }, [loadDashboardData])

  // Navigation actions
  const navigateToProjects = useCallback(() => {
    navigate("/projects")
  }, [navigate])

  const navigateToLabels = useCallback(() => {
    navigate("/labels")
  }, [navigate])

  const navigateToUsers = useCallback(() => {
    navigate("/users")
  }, [navigate])

  const navigateToTasks = useCallback(() => {
    navigate("/tasks")
  }, [navigate])

  // Initialize quick actions
  useEffect(() => {
    const quickActions: QuickAction[] = [
      {
        id: "create-project",
        label: "Create Project",
        description: "Start a new labeling project",
        icon: "FolderPlus",
        action: navigateToProjects,
        color: "bg-primary hover:bg-primary/90",
      },
      {
        id: "manage-labels",
        label: "Manage Labels",
        description: "View and organize labels",
        icon: "Tag",
        action: navigateToLabels,
        color: "bg-green-600 hover:bg-green-700",
      },
      {
        id: "manage-users",
        label: "Manage Users",
        description: "Add and manage team members",
        icon: "Users",
        action: navigateToUsers,
        color: "bg-purple-600 hover:bg-purple-700",
      },
      {
        id: "view-tasks",
        label: "View Tasks",
        description: "Monitor task progress",
        icon: "CheckSquare",
        action: navigateToTasks,
        color: "bg-orange-600 hover:bg-orange-700",
      },
    ]

    setState((prev) => ({ ...prev, quickActions }))
  }, [navigateToProjects, navigateToLabels, navigateToUsers, navigateToTasks])

  // Load data on mount
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Computed values
  const hasData =
    state.statistics.totalProjects > 0 || state.statistics.activeUsers > 0
  const isEmpty = !hasData && !state.isLoading
  const statisticsLoaded = state.lastUpdated !== null

  return {
    ...state,
    loadDashboardData,
    refreshData,
    navigateToProjects,
    navigateToLabels,
    navigateToUsers,
    navigateToTasks,
    hasData,
    isEmpty,
    statisticsLoaded,
  }
}
