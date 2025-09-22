import { memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Loader2
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
import { useProjectListViewModel } from "@/viewmodels/project-list-viewmodel"
import { cn } from "@/lib/utils"

const ProjectList = memo(() => {
  const viewModel = useProjectListViewModel()

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Unknown"
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  const formatTime = (date: Date | undefined) => {
    if (!date) return "Unknown"
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Projects
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your annotation projects and datasets
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={viewModel.refreshProjects}
                disabled={viewModel.isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", viewModel.isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={viewModel.navigateToCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={viewModel.searchQuery}
                  onChange={(e) => viewModel.setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                  viewModel.setSortOrder(viewModel.sortOrder === "asc" ? "desc" : "asc")
                }
                className="gap-1"
              >
                {viewModel.sortOrder === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
                {viewModel.sortOrder === "asc" ? "Asc" : "Desc"}
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {viewModel.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
              </div>
            </div>
          ) : viewModel.error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                  Error Loading Projects
                </p>
                <p className="text-red-500 dark:text-red-300 text-sm mb-4">
                  {viewModel.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={viewModel.loadProjects}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          ) : viewModel.isEmpty ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 max-w-md mx-auto">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No projects found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {viewModel.searchQuery 
                    ? "No projects match your search criteria"
                    : "Create your first project to get started with annotation"
                  }
                </p>
                <Button onClick={viewModel.navigateToCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {viewModel.filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    layout
                  >
                    <Card className="group overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold truncate">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs">
                                Created {formatDate(project.createdAt)}
                              </span>
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {project.images?.length || 0} images
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <ImageIcon className="h-4 w-4" />
                            <span>{project.images?.length || 0} images</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>Modified {formatTime(project.updatedAt)}</span>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewModel.navigateToProject(project.id)}
                          className="gap-2 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FolderOpen className="h-4 w-4" />
                          Open
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          onClick={() => viewModel.deleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Results Summary */}
        {!viewModel.isEmpty && !viewModel.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {viewModel.filteredProjects.length} of {viewModel.projects.length} projects
              {viewModel.searchQuery && ` matching "${viewModel.searchQuery}"`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
})

ProjectList.displayName = "ProjectList"

export default ProjectList