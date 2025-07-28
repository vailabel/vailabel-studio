import React, { useEffect, useState } from "react"
import { Plus, Search, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useTaskStore } from "@/stores/use-task-store"
import { useProjectStore } from "@/stores/use-project-store"
import { useSettingsStore } from "@/stores/use-settings-store"
import { TaskCard } from "@/components/task-card-v2"
import { TaskDialog } from "@/components/task-dialog"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { TaskStatsCards } from "@/components/task-stats-cards"
import { TaskKanban } from "@/components/task-kanban"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { Task } from "@vailabel/core"
import { cn } from "@/lib/utils"

export default function TaskPage() {
  const { toast } = useToast()
  const confirm = useConfirmDialog()

  // Stores
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    getTasksByProjectId,
    updateTaskStatus,
    getTasksByStatus,
    searchTasks,
    loadSampleTasks,
  } = useTaskStore()

  const { projects, getProjects } = useProjectStore()
  const { getSetting, saveOrUpdateSettings } = useSettingsStore()

  // Local state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = getSetting("task-page-active-tab")
    return savedTab?.value || "all"
  })
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    const savedViewMode = getSetting("task-page-view-mode")
    return (savedViewMode?.value as "list" | "kanban") || "list"
  })
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Available users for assignment
  const availableUsers = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Bob Johnson" },
    { id: "4", name: "Alice Brown" },
    { id: "5", name: "Charlie Wilson" },
    { id: "6", name: "Diana Prince" },
    { id: "7", name: "Peter Parker" },
    { id: "8", name: "Mary Jane" },
  ]

  // Persist settings to store
  useEffect(() => {
    saveOrUpdateSettings("task-page-active-tab", activeTab)
  }, [activeTab, saveOrUpdateSettings])

  useEffect(() => {
    saveOrUpdateSettings("task-page-view-mode", viewMode)
  }, [viewMode, saveOrUpdateSettings])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      await getProjects()
    }
    loadData()
  }, [getProjects])

  useEffect(() => {
    if (projects.length > 0) {
      // Load tasks for the first project or all projects
      getTasksByProjectId(projects[0]?.id || "")
    } else {
      // Load sample tasks if no projects
      loadSampleTasks()
    }
  }, [projects, getTasksByProjectId, loadSampleTasks])

  // Filter tasks based on current filters
  const filteredTasks = React.useMemo(() => {
    let filtered = tasks

    // Search filter
    if (searchQuery) {
      filtered = searchTasks(searchQuery)
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // Project filter
    if (projectFilter !== "all") {
      filtered = filtered.filter((task) => task.projectId === projectFilter)
    }

    // Tab filter
    if (activeTab !== "all") {
      filtered = getTasksByStatus(activeTab)
    }

    return filtered
  }, [
    tasks,
    searchQuery,
    statusFilter,
    projectFilter,
    activeTab,
    searchTasks,
    getTasksByStatus,
  ])

  // Task statistics
  const taskStats = React.useMemo(() => {
    const total = tasks.length
    const completed = getTasksByStatus("completed").length
    const inProgress = getTasksByStatus("in-progress").length
    const pending = getTasksByStatus("pending").length
    const blocked = getTasksByStatus("blocked").length

    return { total, completed, inProgress, pending, blocked }
  }, [tasks, getTasksByStatus])

  // Handlers
  const handleCreateTask = () => {
    setEditingTask(null)
    setIsDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsDialogOpen(true)
  }

  const handleViewTaskDetails = (task: Task) => {
    setDetailTask(task)
    setIsDetailDialogOpen(true)
  }

  const handleSaveTaskDetails = async (updatedTask: Task) => {
    try {
      await updateTask(updatedTask.id, updatedTask)
      setDetailTask(updatedTask) // Update the detail view with the new data
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
    } catch (error) {
      console.error("Failed to update task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    const confirmed = await confirm({
      title: "Delete Task",
      description: `Are you sure you want to delete "${task?.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      try {
        await deleteTask(taskId)
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
    }
  }

  const handleStatusChange = async (taskId: string, status: string) => {
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
  }

  const handleAssignTask = async (taskId: string, assignee?: string) => {
    try {
      if (assignee !== undefined) {
        // Direct assignment from kanban card
        const taskToUpdate = tasks.find((t) => t.id === taskId)
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
      } else {
        // Fallback to opening edit dialog
        const task = tasks.find((t) => t.id === taskId)
        if (task) {
          handleEditTask(task)
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      })
    }
  }

  const handleSaveTask = async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ) => {
    try {
      if (taskData.id) {
        // Update existing task
        await updateTask(taskData.id, taskData)
        toast({
          title: "Success",
          description: "Task updated successfully",
        })
      } else {
        // Create new task
        const newTask: Task = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await createTask(newTask)
        toast({
          title: "Success",
          description: "Task created successfully",
        })
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
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">
            Organize and track your annotation tasks
          </p>
        </div>
        <Button onClick={handleCreateTask} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="mb-8">
        <TaskStatsCards stats={taskStats} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit ml-auto sm:ml-0">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(
              "h-8 px-3 transition-all text-xs sm:text-sm",
              viewMode === "list" && "shadow-sm"
            )}
          >
            <List className="h-4 w-4 mr-1 sm:mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className={cn(
              "h-8 px-3 transition-all text-xs sm:text-sm",
              viewMode === "kanban" && "shadow-sm"
            )}
          >
            <LayoutGrid className="h-4 w-4 mr-1 sm:mr-2" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Task Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {taskStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            <Badge variant="secondary" className="ml-2">
              {taskStats.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress
            <Badge variant="secondary" className="ml-2">
              {taskStats.inProgress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge variant="secondary" className="ml-2">
              {taskStats.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked
            <Badge variant="secondary" className="ml-2">
              {taskStats.blocked}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {viewMode === "kanban" ? (
            <TaskKanban
              tasks={filteredTasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onAssign={handleAssignTask}
              onTaskMove={handleStatusChange}
              onViewDetails={handleViewTaskDetails}
              availableUsers={availableUsers}
            />
          ) : filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  onAssign={handleAssignTask}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">📋</div>
                  <h3 className="text-lg font-semibold">No tasks found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ||
                    statusFilter !== "all" ||
                    projectFilter !== "all"
                      ? "Try adjusting your filters or search query."
                      : "Get started by creating your first task."}
                  </p>
                  {!searchQuery &&
                    statusFilter === "all" &&
                    projectFilter === "all" && (
                      <Button onClick={handleCreateTask}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Task
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <TaskDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        task={editingTask}
        onSave={handleSaveTask}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        users={[
          { id: "1", name: "John Doe", email: "john@example.com" },
          { id: "2", name: "Jane Smith", email: "jane@example.com" },
          { id: "3", name: "Bob Johnson", email: "bob@example.com" },
        ]}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={detailTask}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onStatusChange={handleStatusChange}
        onSave={handleSaveTaskDetails}
      />
    </div>
  )
}
