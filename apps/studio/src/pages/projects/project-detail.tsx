import { memo } from "react"
import {
  ArrowLeft,
  ImageIcon,
  Tag,
  Calendar,
  RefreshCw,
  Loader2,
  Edit,
  Plus,
  Trash2,
  Upload,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ImageTable } from "@/components/tables/image-table"
import { EditProjectModal } from "@/components/modals/edit-project-modal"
import { AddLabelModal } from "@/components/modals/add-label-modal"
import { ImageGrid } from "@/components/ui/image-upload"
import { useProjectDetailViewModel } from "@/viewmodels/project-detail-viewmodel"
import { useParams } from "react-router-dom"
import { cn } from "@/lib/utils"

const ProjectDetails = memo(() => {
  const { projectId } = useParams<{ projectId: string }>()
  const viewModel = useProjectDetailViewModel(projectId || "")

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Unknown"
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return "Unknown"
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(dateObj)
    } catch {
      return "Unknown"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
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
                <h1 className="text-3xl font-bold text-foreground">
                  {viewModel.projectName}
                </h1>
                <p className="text-muted-foreground">
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
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    viewModel.isLoading && "animate-spin"
                  )}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Project Stats */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: "100ms" }}
          >
            <Card className="bg-card backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Images</p>
                    <p className="text-2xl font-bold text-foreground">
                      {viewModel.totalCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Labels</p>
                    <p className="text-2xl font-bold text-foreground">
                      {viewModel.labelCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(viewModel.project?.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: "200ms" }}
        >
          {viewModel.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading project data...</p>
              </div>
            </div>
          ) : viewModel.error ? (
            <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-destructive font-medium mb-2">
                  Error Loading Project
                </p>
                <p className="text-destructive/80 text-sm mb-4">
                  {typeof viewModel.error === "string"
                    ? viewModel.error
                    : "An error occurred"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={viewModel.loadProjectData}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <Card className="bg-card backdrop-blur-sm border-border">
              <Tabs
                value={viewModel.activeTab}
                onValueChange={(value) =>
                  viewModel.setActiveTab(
                    value as "images" | "upload" | "labels"
                  )
                }
              >
                <TabsList className="grid w-full grid-cols-3 bg-muted">
                  <TabsTrigger value="images" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Images ({viewModel.totalCount})
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload
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

                <TabsContent value="upload" className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">Upload Images</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add new images to your project for annotation
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {viewModel.newImages.length} selected
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={viewModel.addImagesFromFolder}
                      disabled={viewModel.isUploading}
                    >
                      {viewModel.isUploading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <FolderOpen className="mr-2 h-5 w-5" />
                      )}
                      {viewModel.isUploading
                        ? "Scanning folder..."
                        : "Open Image Folder"}
                    </Button>

                    <ImageGrid
                      images={viewModel.newImages}
                      onRemove={viewModel.handleRemoveImage}
                    />

                    {viewModel.newImages.length > 0 && (
                      <div className="flex justify-end pt-4 border-t border-border/50">
                        <Button
                          onClick={viewModel.saveImages}
                          disabled={viewModel.isUploading || viewModel.isSaving}
                          className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {viewModel.isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving Images...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Save {viewModel.newImages.length} Image
                              {viewModel.newImages.length !== 1 ? "s" : ""}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
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
                        {viewModel.labels.map((label, index) => (
                          <div
                            key={label.id}
                            className="animate-in fade-in zoom-in-95 duration-200 fill-mode-both"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                              <Card className="bg-card border-border hover:shadow-md transition-shadow group">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: label.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground truncate">
                                        {label.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {label.color}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        viewModel.deleteLabel(label.id)
                                      }
                                      disabled={viewModel.isCreatingLabel}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 animate-in fade-in duration-300">
                        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          No labels found
                        </h3>
                        <p className="text-muted-foreground">
                          This project doesn't have any labels yet.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditProjectModal
        isOpen={viewModel.isEditProjectModalOpen}
        onClose={viewModel.closeEditProjectModal}
        onSave={viewModel.updateProject}
        isLoading={viewModel.isEditingProject}
        projectName={viewModel.projectName}
        projectDescription={viewModel.project?.description ?? ""}
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
