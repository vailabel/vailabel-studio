import { memo } from "react"
import {
  Plus,
  Trash2,
  FolderOpen,
  ImageIcon,
  Search,
  SortAsc,
  SortDesc,
  RefreshCw,
  Calendar,
  Clock,
  AlertCircle,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProjectListViewModel } from "@/viewmodels/project-list-viewmodel"
import { cn } from "@/lib/utils"

const ProjectList = memo(() => {
  const viewModel = useProjectListViewModel()

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Unknown"
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return "Unknown"
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dateObj)
    } catch {
      return "Unknown"
    }
  }

  const formatTime = (date: Date | string | undefined) => {
    if (!date) return "Unknown"
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return "Unknown"
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj)
    } catch {
      return "Unknown"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Manage your annotation projects and datasets
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={viewModel.refreshProjects}
              disabled={viewModel.isLoading}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  viewModel.isLoading && "animate-spin"
                )}
              />
              Refresh
            </Button>
            <Button onClick={viewModel.navigateToCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={viewModel.searchQuery}
              onChange={(e) => viewModel.setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Select
              value={viewModel.sortBy}
              onValueChange={(value: "name" | "createdAt" | "updatedAt") =>
                viewModel.setSortBy(value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Created</SelectItem>
                <SelectItem value="updatedAt">Modified</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                viewModel.setSortOrder(
                  viewModel.sortOrder === "asc" ? "desc" : "asc"
                )
              }
            >
              {viewModel.sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {viewModel.isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : viewModel.error ? (
        <div className="flex items-center justify-center py-12">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Projects</AlertTitle>
            <AlertDescription>
              {viewModel.error instanceof Error
                ? viewModel.error.message
                : String(viewModel.error)}
            </AlertDescription>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={viewModel.loadProjects}
              >
                Try Again
              </Button>
            </div>
          </Alert>
        </div>
      ) : viewModel.isEmpty ? (
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No projects found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {viewModel.searchQuery
                    ? "No projects match your search criteria"
                    : "Create your first project to get started with annotation"}
                </p>
                <Button onClick={viewModel.navigateToCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {viewModel.projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{project.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(project.createdAt)}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {project.images?.length || 0} images
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>{project.images?.length || 0} images</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Modified {formatTime(project.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewModel.navigateToProject(project.id)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => viewModel.deleteProject(project.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Results Summary */}
      {!viewModel.isEmpty && !viewModel.isLoading && (
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Showing {viewModel.projects.length} of{" "}
            {viewModel.allProjects.length} projects
            {viewModel.searchQuery && ` matching "${viewModel.searchQuery}"`}
          </p>
        </div>
      )}
    </div>
  )
})

ProjectList.displayName = "ProjectList"

export default ProjectList
