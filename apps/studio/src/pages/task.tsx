import { Plus, Search, LayoutGrid, List, RefreshCw, Filter } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TaskCard } from "@/components/task-card-v2"
import { TaskDialog } from "@/components/task-dialog"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { TaskStatsCards } from "@/components/task-stats-cards"
import { TaskKanban } from "@/components/task-kanban"
import { useTaskPageViewModel } from "@/viewmodels/task-page-viewmodel"
import { cn } from "@/lib/utils"

export default function TaskPage() {
  const viewModel = useTaskPageViewModel()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Enhanced Header */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Task Management
                </CardTitle>
                <p className="text-muted-foreground">
                  Organize and track your annotation tasks efficiently
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={viewModel.refreshData}
                        disabled={viewModel.isLoadingData}
                        className="gap-2"
                      >
                        <RefreshCw className={cn("w-4 h-4", viewModel.isLoadingData && "animate-spin")} />
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh task data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  onClick={viewModel.openCreateDialog}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Statistics Cards */}
        <div className="mb-8">
          <TaskStatsCards stats={viewModel.taskStats} />
        </div>

        {/* Enhanced Filters */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Filters & Search
              </CardTitle>
              <div className="flex items-center gap-2">
                {(viewModel.filters.searchQuery || 
                  viewModel.filters.statusFilter !== "all" || 
                  viewModel.filters.projectFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      viewModel.setSearchQuery("")
                      viewModel.setStatusFilter("all")
                      viewModel.setProjectFilter("all")
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Search Tasks</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name or description..."
                    value={viewModel.filters.searchQuery}
                    onChange={(e) => viewModel.setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select value={viewModel.filters.statusFilter} onValueChange={viewModel.setStatusFilter}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Project</label>
                <Select value={viewModel.filters.projectFilter} onValueChange={viewModel.setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {viewModel.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced View Controls */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Tasks</h2>
                <p className="text-sm text-muted-foreground">
                  {viewModel.filteredTasks.length} of {viewModel.tasks.length} tasks
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={viewModel.viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => viewModel.setViewMode("list")}
                    className={cn(
                      "h-8 px-3 transition-all text-xs sm:text-sm",
                      viewModel.viewMode === "list" && "shadow-sm"
                    )}
                  >
                    <List className="h-4 w-4 mr-1 sm:mr-2" />
                    List
                  </Button>
                  <Button
                    variant={viewModel.viewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => viewModel.setViewMode("kanban")}
                    className={cn(
                      "h-8 px-3 transition-all text-xs sm:text-sm",
                      viewModel.viewMode === "kanban" && "shadow-sm"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1 sm:mr-2" />
                    Kanban
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Task Tabs */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <Tabs value={viewModel.filters.activeTab} onValueChange={viewModel.setActiveTab}>
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-5 bg-muted/50">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    All
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {viewModel.taskStats.total}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    Pending
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {viewModel.taskStats.pending}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="in-progress" className="flex items-center gap-2">
                    In Progress
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {viewModel.taskStats.inProgress}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-2">
                    Completed
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {viewModel.taskStats.completed}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="blocked" className="flex items-center gap-2">
                    Blocked
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {viewModel.taskStats.blocked}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={viewModel.filters.activeTab} className="px-6 pb-6">
                {viewModel.viewMode === "kanban" ? (
                  <TaskKanban
                    tasks={viewModel.filteredTasks}
                    onEdit={viewModel.openEditDialog}
                    onDelete={viewModel.handleDeleteTask}
                    onStatusChange={viewModel.handleStatusChange}
                    onAssign={viewModel.handleAssignTask}
                    onTaskMove={viewModel.handleStatusChange}
                    onViewDetails={viewModel.openDetailDialog}
                    availableUsers={viewModel.availableUsers}
                  />
                ) : viewModel.filteredTasks.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {viewModel.filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={viewModel.openEditDialog}
                        onDelete={viewModel.handleDeleteTask}
                        onStatusChange={viewModel.handleStatusChange}
                        onAssign={viewModel.handleAssignTask}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-6">
                        <div className="text-6xl">📋</div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">No tasks found</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            {viewModel.filters.searchQuery ||
                            viewModel.filters.statusFilter !== "all" ||
                            viewModel.filters.projectFilter !== "all"
                              ? "Try adjusting your filters or search query to find what you're looking for."
                              : "Get started by creating your first task to organize your work."}
                          </p>
                        </div>
                        {!viewModel.filters.searchQuery &&
                          viewModel.filters.statusFilter === "all" &&
                          viewModel.filters.projectFilter === "all" && (
                            <Button 
                              onClick={viewModel.openCreateDialog}
                              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                            >
                              <Plus className="w-4 h-4" />
                              Create First Task
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Task Dialog */}
        <TaskDialog
          open={viewModel.isDialogOpen}
          onOpenChange={(open) => !open && viewModel.closeDialog()}
          task={viewModel.editingTask}
          onSave={viewModel.handleSaveTask}
          projects={viewModel.projects.map((p) => ({ id: p.id, name: p.name }))}
          users={viewModel.availableUsers.map(user => ({ 
            id: user.id, 
            name: user.name, 
            email: user.email || `${user.name.toLowerCase().replace(' ', '.')}@example.com` 
          }))}
        />

        {/* Task Detail Dialog */}
        <TaskDetailDialog
          task={viewModel.detailTask}
          open={viewModel.isDetailDialogOpen}
          onOpenChange={(open) => !open && viewModel.closeDetailDialog()}
          onStatusChange={viewModel.handleStatusChange}
          onSave={viewModel.handleSaveTask}
        />
      </div>
    </div>
  )
}
