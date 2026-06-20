import { memo, useMemo } from "react"
import {
  ArrowLeft,
  ImageIcon,
  FileText,
  Tag,
  Calendar,
  RefreshCw,
  Edit,
  Plus,
  Trash2,
  Upload,
  FolderOpen,
  Play,
  Layers,
  BarChart3,
  CheckCircle2,
  CloudUpload,
  CloudDownload,
  Brain,
  Clapperboard,
  Settings,
  X,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { Progress } from "@/shared/ui/progress"
import { Spinner } from "@/shared/ui/spinner"
import { ImageTable } from "@/features/projects/components/image-table"
import { TrainingMonitor } from "@/shared/components/training/training-monitor"
import { ModelFlywheel } from "@/features/projects/components/model-flywheel"
import { DatasetImportCard } from "@/features/projects/components/dataset-import-card"
import type { DatasetImportFormat } from "@/shared/types/ai-runtime"
import { EditProjectModal } from "@/features/projects/components/edit-project-modal"
import { AddLabelModal } from "@/features/projects/components/add-label-modal"
import { ImageGrid } from "@/features/projects/components/image-upload"
import { useProjectDetailViewModel } from "@/features/projects/model/project-detail-viewmodel"
import { descriptorForKind } from "@/features/projects/model/modality-registry"
import type { DataKind } from "@/shared/lib/label-config/labeling-templates"
import { useProjectCloudSync } from "@/features/projects/hooks/use-project-cloud-sync"
import { ProjectSettingsTab } from "@/features/projects/components/project-settings-tab"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"

const formatDate = (date: Date | string | undefined) => {
  if (!date) return "Unknown"
  const dateObj = typeof date === "string" ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return "Unknown"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateObj)
}

const ProjectDetails = memo(() => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const viewModel = useProjectDetailViewModel(projectId || "")
  const cloudSync = useProjectCloudSync(
    projectId || "",
    viewModel.refreshData,
    viewModel.project?.config?.storage
  )
  const s = viewModel.projectStats

  // First image still needing annotation (so "Continue Labeling" resumes work).
  const annotatedItemIds = useMemo(
    () =>
      new Set(
        viewModel.annotations
          .map((a) => a.item_id ?? a.itemId)
          .filter(Boolean) as string[]
      ),
    [viewModel.annotations]
  )

  const nextImageId = useMemo(() => {
    const next = viewModel.images.find((img) => !annotatedItemIds.has(img.id))
    return (next ?? viewModel.images[0])?.id
  }, [viewModel.images, annotatedItemIds])

  // Annotation count per class, for the distribution view.
  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of viewModel.annotations) {
      const id = a.label_id ?? a.labelId
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [viewModel.annotations])

  const maxLabelCount = useMemo(
    () =>
      Math.max(1, ...viewModel.labels.map((l) => labelCounts.get(l.id) ?? 0)),
    [viewModel.labels, labelCounts]
  )

  const labelingCta =
    s.progress >= 100
      ? "Review images"
      : s.annotatedImages > 0
        ? "Continue labeling"
        : "Start labeling"

  // Import an annotated dataset folder (format auto-detected or forced) and
  // report what landed.
  const handleImportDataset = async (format: DatasetImportFormat = "auto") => {
    try {
      const res = await viewModel.importDataset(format)
      if (!res) return
      toast.success(
        `Imported ${res.itemCount} images · ${res.annotationCount} boxes · ${res.createdClassCount} new classes (${res.format.toUpperCase()})`,
        {
          description: res.warnings.length
            ? `${res.warnings.length} item(s) were skipped — open the console for details.`
            : "Switch to the Images tab to keep labeling, or Model to train on them.",
        }
      )
      if (res.warnings.length) {
        console.warn("Dataset import warnings:", res.warnings)
      }
    } catch (e) {
      toast.error("Import failed", {
        description: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const stats = [
    { label: "Images", value: s.totalItems, icon: ImageIcon },
    {
      label: "Annotated",
      value: `${s.annotatedImages} / ${s.totalItems}`,
      icon: CheckCircle2,
    },
    { label: "Annotations", value: s.totalAnnotations, icon: BarChart3 },
    { label: "Classes", value: s.totalLabels, icon: Layers },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={viewModel.navigateBack}
          className="-ml-2 w-fit gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-foreground">
                {viewModel.projectName}
              </h1>
              {viewModel.project?.type && (
                <Badge variant="secondary" className="capitalize">
                  {viewModel.project.type}
                </Badge>
              )}
              {viewModel.project?.status && (
                <Badge variant="outline" className="capitalize">
                  {viewModel.project.status}
                </Badge>
              )}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {viewModel.project?.description?.trim() ||
                "No description yet — edit the project to add one."}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              Created {formatDate(viewModel.project?.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewModel.project?.modality === "video" && (
              <Button
                size="sm"
                onClick={viewModel.openVideoEditor}
                className="gap-1.5"
              >
                <Clapperboard className="size-4" />
                Open video editor
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={viewModel.refreshData}
              disabled={viewModel.isLoading}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("size-4", viewModel.isLoading && "animate-spin")}
              />
              Refresh
            </Button>
            {cloudSync.activeConfig && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cloudSync.pushToCloud}
                  disabled={cloudSync.isSyncing}
                  className="gap-1.5"
                  title={`Upload items to ${cloudSync.activeConfig.name}`}
                >
                  <CloudUpload
                    className={cn(
                      "size-4",
                      cloudSync.isSyncing && "animate-pulse"
                    )}
                  />
                  Push
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cloudSync.pullFromCloud}
                  disabled={cloudSync.isSyncing}
                  className="gap-1.5"
                  title={`Download items from ${cloudSync.activeConfig.name}`}
                >
                  <CloudDownload
                    className={cn(
                      "size-4",
                      cloudSync.isSyncing && "animate-pulse"
                    )}
                  />
                  Pull
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={viewModel.openEditProjectModal}
              className="gap-1.5"
            >
              <Edit className="size-4" />
              Edit
            </Button>
            <Button
              size="sm"
              onClick={() => nextImageId && viewModel.navigateToItem(nextImageId)}
              disabled={!nextImageId}
              className="gap-1.5"
            >
              <Play className="size-4" />
              {labelingCta}
            </Button>
          </div>
        </div>
      </div>

      {viewModel.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Spinner className="size-6" />
            <p className="text-sm">Loading project data…</p>
          </div>
        </div>
      ) : viewModel.error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-medium text-destructive">Error loading project</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {typeof viewModel.error === "string"
                ? viewModel.error
                : "An unexpected error occurred."}
            </p>
            <Button variant="outline" size="sm" onClick={viewModel.loadProjectData}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} size="sm">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <stat.icon className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="truncate text-lg font-semibold tabular-nums text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Labeling progress</CardTitle>
              <CardAction>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {s.annotatedImages} / {s.totalItems} images · {s.progress}%
                </span>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Progress value={s.progress} />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={viewModel.activeTab}
            onValueChange={(value) =>
              viewModel.setActiveTab(
                value as "images" | "upload" | "labels" | "training" | "settings"
              )
            }
            className="gap-4"
          >
            <TabsList>
              <TabsTrigger value="images" className="gap-1.5">
                <ImageIcon className="size-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="labels" className="gap-1.5">
                <Tag className="size-4" />
                Classes
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="size-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-1.5">
                <Brain className="size-4" />
                Model
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 ml-auto">
                <Settings className="size-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Items</h2>
                <Badge variant="secondary">{s.totalItems} total</Badge>
              </div>
              <ImageTable
                images={viewModel.images}
                isLoading={viewModel.isItemsLoading}
                onImageClick={viewModel.navigateToItem}
                onImageDelete={viewModel.deleteItem}
                showActions
                server={{
                  page: viewModel.itemsPage,
                  pageSize: viewModel.itemsPageSize,
                  total: viewModel.itemsTotal,
                  search: viewModel.itemsSearch,
                  onPageChange: viewModel.setItemsPage,
                  onPageSizeChange: viewModel.setItemsPageSize,
                  onSearchChange: viewModel.setItemsSearch,
                }}
              />
            </TabsContent>

            <TabsContent value="labels" className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Classes</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{s.totalLabels} total</Badge>
                  <Button
                    size="sm"
                    onClick={viewModel.openAddLabelModal}
                    className="gap-1.5"
                  >
                    <Plus className="size-4" />
                    Add class
                  </Button>
                </div>
              </div>

              {viewModel.labels.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {viewModel.labels.map((label) => {
                    const count = labelCounts.get(label.id) ?? 0
                    const pct = Math.round((count / maxLabelCount) * 100)
                    return (
                      <Card key={label.id} size="sm">
                        <CardContent className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {label.name}
                            </span>
                            <Badge variant="secondary" className="tabular-nums">
                              {count}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => viewModel.deleteLabel(label.id)}
                              disabled={viewModel.isCreatingLabel}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Delete ${label.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: label.color,
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Tag className="size-10 text-muted-foreground" />}
                  title="No classes yet"
                  description="Add classes to start annotating, or they'll be created on the fly while labeling."
                  action={
                    <Button onClick={viewModel.openAddLabelModal} className="gap-1.5">
                      <Plus className="size-4" />
                      Add your first class
                    </Button>
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="upload" className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">Add data</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Bring your media into this project, and optionally import
                  existing annotations. Files are referenced in place — nothing is
                  copied.
                </p>
              </div>

              {(() => {
                const modality = viewModel.project?.modality ?? "image"
                const descriptor = descriptorForKind(modality as DataKind)
                const isImageModality =
                  !descriptor || descriptor.importMode === "folder"

                const mediaCard = isImageModality ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Add images</h3>
                      <Badge variant="secondary">
                        {viewModel.newImages.length} selected
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={viewModel.addImagesFromFolder}
                      disabled={viewModel.isUploading}
                    >
                      {viewModel.isUploading ? (
                        <Spinner />
                      ) : (
                        <FolderOpen className="size-5" />
                      )}
                      {viewModel.isUploading
                        ? "Scanning folder…"
                        : "Open image folder"}
                    </Button>
                    <ImageGrid
                      images={viewModel.newImages}
                      onRemove={viewModel.handleRemoveImage}
                    />
                    {viewModel.newImages.length > 0 && (
                      <div className="flex justify-end">
                        <Button
                          onClick={viewModel.saveImages}
                          disabled={viewModel.isUploading || viewModel.isSaving}
                          className="gap-1.5"
                        >
                          {viewModel.isSaving ? (
                            <Spinner />
                          ) : (
                            <Plus className="size-4" />
                          )}
                          {viewModel.isSaving
                            ? "Saving images…"
                            : `Save ${viewModel.newImages.length} image${
                                viewModel.newImages.length !== 1 ? "s" : ""
                              }`}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  (() => {
                    const kindLabel = descriptor.label
                    const fileLabel = modality === "audio" ? "clips" : "files"
                    return (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            Add {kindLabel.toLowerCase()} {fileLabel}
                          </h3>
                          <Badge variant="secondary">
                            {viewModel.newDocuments.length} selected
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() =>
                            void viewModel.addDocumentFiles(descriptor.extensions)
                          }
                          disabled={viewModel.isUploading}
                        >
                          {viewModel.isUploading ? (
                            <Spinner />
                          ) : (
                            <FileText className="size-5" />
                          )}
                          {viewModel.isUploading
                            ? "Opening…"
                            : `Select ${kindLabel.toLowerCase()} ${fileLabel}`}
                        </Button>
                        {viewModel.newDocuments.length > 0 && (
                          <>
                            <ul className="divide-y divide-border rounded-lg border border-border">
                              {viewModel.newDocuments.map((doc, index) => (
                                <li
                                  key={doc.id}
                                  className="flex items-center gap-2 px-3 py-2 text-sm"
                                >
                                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                                  <span
                                    className="min-w-0 flex-1 truncate"
                                    title={doc.path}
                                  >
                                    {doc.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      viewModel.handleRemoveDocument(index)
                                    }
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    aria-label={`Remove ${doc.name}`}
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <div className="flex justify-end">
                              <Button
                                onClick={() => void viewModel.saveDocuments()}
                                disabled={
                                  viewModel.isUploading || viewModel.isSaving
                                }
                                className="gap-1.5"
                              >
                                {viewModel.isSaving ? (
                                  <Spinner />
                                ) : (
                                  <Plus className="size-4" />
                                )}
                                {viewModel.isSaving
                                  ? `Saving ${fileLabel}…`
                                  : `Save ${viewModel.newDocuments.length} ${fileLabel}`}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()
                )

                return (
                  <div className="flex flex-col gap-4">
                    {mediaCard}
                    {isImageModality && (
                      <DatasetImportCard
                        isImporting={viewModel.isImporting}
                        onImport={handleImportDataset}
                      />
                    )}
                  </div>
                )
              })()}
            </TabsContent>

            <TabsContent value="training" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Project model</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    This project trains its own model from your labels. Label a
                    few → train → auto-label → correct → repeat; each cycle
                    improves the model and the latest version pre-labels the rest.
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/projects/train/${projectId}`)}
                  className="gap-1.5"
                >
                  <Brain className="size-4" />
                  Train new version
                </Button>
              </div>
              <ModelFlywheel
                projectId={projectId}
                annotatedImages={s.annotatedImages}
                totalItems={s.totalItems}
              />
              <TrainingMonitor
                projectId={projectId}
                onUseForLabeling={() =>
                  nextImageId && viewModel.navigateToItem(nextImageId)
                }
              />
            </TabsContent>

            <TabsContent value="settings" className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">Project settings</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Per-project configuration — labeling behavior, export
                  defaults, and AI preferences that apply only to this dataset.
                </p>
              </div>
              <ProjectSettingsTab
                project={viewModel.project}
                onSaved={viewModel.refreshData}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

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

const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
      {icon}
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </CardContent>
  </Card>
)

export default ProjectDetails
