import { memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  ImageIcon, 
  Tag, 
  Calendar, 
  RefreshCw,
  Loader2,
  Edit,
  Plus,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ImageTable } from "@/components/tables/image-table"
import { EditProjectModal } from "@/components/modals/edit-project-modal"
import { AddLabelModal } from "@/components/modals/add-label-modal"
import { useProjectDetailViewModel } from "@/viewmodels/project-detail-viewmodel"
import { cn } from "@/lib/utils"

const ProjectDetails = memo(() => {
  const viewModel = useProjectDetailViewModel()

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Unknown"
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
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
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={viewModel.navigateBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {viewModel.projectName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Project overview and management
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={viewModel.openEditProjectModal}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Project
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={viewModel.refreshData}
                disabled={viewModel.isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", viewModel.isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Project Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Images</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {viewModel.totalCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Labels</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {viewModel.labelCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDate(viewModel.project?.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {viewModel.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-gray-600 dark:text-gray-400">Loading project data...</p>
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
                  Error Loading Project
                </p>
                <p className="text-red-500 dark:text-red-300 text-sm mb-4">
                  {viewModel.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={viewModel.loadProjectData}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          ) : (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <Tabs value={viewModel.activeTab} onValueChange={(value) => viewModel.setActiveTab(value as "images" | "labels")}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700">
                  <TabsTrigger value="images" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Images ({viewModel.totalCount})
                  </TabsTrigger>
                  <TabsTrigger value="labels" className="gap-2">
                    <Tag className="h-4 w-4" />
                    Labels ({viewModel.labelCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Images</h2>
                      <Badge variant="secondary">
                        {viewModel.totalCount} total
                      </Badge>
                    </div>

                    <ImageTable
                      images={viewModel.images}
                      isLoading={viewModel.isLoading}
                      onImageClick={viewModel.navigateToImage}
                      onImageDelete={viewModel.deleteImage}
                      showActions={true}
                      showPagination={true}
                      pageSize={viewModel.pageSize}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="labels" className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Labels</h2>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {viewModel.labelCount} total
                        </Badge>
                        <Button
                          size="sm"
                          onClick={viewModel.openAddLabelModal}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Label
                        </Button>
                      </div>
                    </div>

                    {viewModel.labels.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {viewModel.labels.map((label, index) => (
                            <motion.div
                              key={label.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: label.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 dark:text-white truncate">
                                        {label.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {label.color}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewModel.deleteLabel(label.id)}
                                      disabled={viewModel.isCreatingLabel}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No labels found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          This project doesn't have any labels yet.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <EditProjectModal
        isOpen={viewModel.isEditProjectModalOpen}
        onClose={viewModel.closeEditProjectModal}
        onSave={viewModel.updateProject}
        isLoading={viewModel.isEditingProject}
        projectName={viewModel.projectName}
        projectDescription=""
      />

      <AddLabelModal
        isOpen={viewModel.isAddLabelModalOpen}
        onClose={viewModel.closeAddLabelModal}
        onCreate={viewModel.createLabel}
        isLoading={viewModel.isCreatingLabel}
      />
    </div>
  )
})

ProjectDetails.displayName = "ProjectDetails"

export default ProjectDetails