/**
 * Overview ViewModel
 * Manages overview/dashboard state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useMemo } from "react"
import { useProjects, useCurrentUser } from "@/hooks/useFastAPIQuery"

export const useOverviewViewModel = () => {
  // Queries
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects()
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser()

  // Computed values
  const stats = useMemo(() => {
    const totalProjects = projects.length
    const activeProjects = projects.filter((p) => p.status === "active").length
    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length
    const draftProjects = projects.filter((p) => p.status === "draft").length

    // Calculate project types distribution
    const projectTypes = projects.reduce(
      (acc, project) => {
        acc[project.type] = (acc[project.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentProjects = projects.filter((project) => {
      if (!project.updatedAt) return false
      try {
        const updatedDate = new Date(project.updatedAt)
        return !isNaN(updatedDate.getTime()) && updatedDate > sevenDaysAgo
      } catch {
        return false
      }
    }).length

    // Calculate total annotations (if available in project data)
    const totalAnnotations = projects.reduce((total, project) => {
      return total + (project.metadata?.annotationCount || 0)
    }, 0)

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      draftProjects,
      recentProjects,
      totalAnnotations,
      projectTypes,
      labelsCreated: projects.reduce((total, project) => {
        return total + (project.metadata?.labelCount || 0)
      }, 0),
      pendingTasks: projects.reduce((total, project) => {
        return total + (project.metadata?.pendingTaskCount || 0)
      }, 0),
    }
  }, [projects])

  const recentProjects = useMemo(() => {
    return projects
      .filter((project) => project.updatedAt)
      .sort((a, b) => {
        try {
          const aDate = new Date(a.updatedAt!)
          const bDate = new Date(b.updatedAt!)
          if (isNaN(aDate.getTime()) || isNaN(bDate.getTime())) return 0
          return bDate.getTime() - aDate.getTime()
        } catch {
          return 0
        }
      })
      .slice(0, 5)
  }, [projects])

  const projectTypeDistribution = useMemo(() => {
    const distribution = Object.entries(stats.projectTypes).map(
      ([type, count]) => ({
        type,
        count,
        percentage: (count / stats.totalProjects) * 100,
      })
    )

    return distribution.sort((a, b) => b.count - a.count)
  }, [stats.projectTypes, stats.totalProjects])

  const activityTimeline = useMemo(() => {
    const timeline = []
    const now = new Date()

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      const dayProjects = projects.filter((project) => {
        if (!project.updatedAt) return false
        try {
          const projectDate = new Date(project.updatedAt)
          if (isNaN(projectDate.getTime())) return false
          return projectDate.toDateString() === date.toDateString()
        } catch {
          return false
        }
      })

      timeline.push({
        date: date.toISOString().split("T")[0],
        count: dayProjects.length,
        projects: dayProjects,
      })
    }

    return timeline
  }, [projects])

  const quickActions = useMemo(() => {
    return [
      {
        id: "create-project",
        label: "Create New Project",
        description: "Start a new annotation project",
        icon: "plus",
        color: "bg-primary",
        action: () => {
          // This would typically navigate to the create project page
          console.log("Navigate to create project")
        },
        disabled: false,
      },
      {
        id: "import-data",
        label: "Import Data",
        description: "Import images and annotations",
        icon: "upload",
        color: "bg-green-600",
        action: () => {
          console.log("Navigate to import data")
        },
        disabled: false,
      },
      {
        id: "view-projects",
        label: "View All Projects",
        description: "Browse your projects",
        icon: "folder",
        color: "bg-blue-600",
        action: () => {
          console.log("Navigate to projects")
        },
        disabled: false,
      },
      {
        id: "settings",
        label: "Settings",
        description: "Configure application settings",
        icon: "settings",
        color: "bg-gray-600",
        action: () => {
          console.log("Navigate to settings")
        },
        disabled: false,
      },
    ]
  }, [])

  const isLoading = projectsLoading || userLoading
  const error = projectsError || userError

  // Helper functions
  const refreshData = () => {
    // This would typically refetch the data
    // For now, we'll just log it
    console.log("Refreshing overview data...")
  }

  const isEmpty = projects.length === 0
  const lastUpdated = new Date()

  return {
    // State
    user,
    projects,
    isLoading,
    error,

    // Computed values
    stats,
    recentProjects,
    projectTypeDistribution,
    activityTimeline,
    quickActions,
    isEmpty,
    lastUpdated,
    refreshData,

    // Helper functions
    getProjectStatusColor: (status: string) => {
      switch (status) {
        case "active":
          return "green"
        case "completed":
          return "blue"
        case "draft":
          return "gray"
        case "archived":
          return "orange"
        default:
          return "gray"
      }
    },

    getProjectTypeIcon: (type: string) => {
      switch (type) {
        case "image_annotation":
          return "image"
        case "object_detection":
          return "target"
        case "segmentation":
          return "layers"
        case "classification":
          return "tag"
        default:
          return "folder"
      }
    },

    formatDate: (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return "Invalid date"
        return date.toLocaleDateString()
      } catch {
        return "Invalid date"
      }
    },

    formatRelativeTime: (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return "Invalid date"
        const now = new Date()
        const diffInHours = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60 * 60)
        )

        if (diffInHours < 1) return "Just now"
        if (diffInHours < 24) return `${diffInHours}h ago`
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
        return date.toLocaleDateString()
      } catch {
        return "Invalid date"
      }
    },
  }
}
