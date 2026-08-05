import { memo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Brain, ImageIcon, Settings, Tag, Upload } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/shared/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { ImageTable } from "@/features/projects/components/image-table"
import { EditProjectModal } from "@/features/projects/components/edit-project-modal"
import { AddLabelModal } from "@/features/projects/components/add-label-modal"
import { ProjectSettingsTab } from "@/features/projects/components/project-settings-tab"
import { AddDataTab } from "@/features/projects/components/detail/add-data-tab"
import { ClassesTab } from "@/features/projects/components/detail/classes-tab"
import { LabelingProgressCard } from "@/features/projects/components/detail/labeling-progress-card"
import { ModelTab } from "@/features/projects/components/detail/model-tab"
import { ProjectDetailHeader } from "@/features/projects/components/detail/project-detail-header"
import {
  ProjectDetailError,
  ProjectDetailLoading,
} from "@/features/projects/components/detail/project-detail-status"
import { ProjectStatsGrid } from "@/features/projects/components/detail/project-stats-grid"
import { ProjectToolbar } from "@/features/projects/components/detail/project-toolbar"
import { TabHeading } from "@/features/projects/components/detail/tab-heading"
import { useProjectDetailViewModel } from "@/features/projects/model/project-detail-viewmodel"
import {
  labelingCtaLabel,
  useProjectDetailDerivations,
} from "@/features/projects/model/use-project-detail-derivations"
import { useProjectCloudSync } from "@/features/projects/hooks/use-project-cloud-sync"
import type { DataKind } from "@/shared/lib/label-config/labeling-templates"
import type { DatasetImportFormat } from "@/shared/types/ai-runtime"

type DetailTab = "images" | "upload" | "labels" | "training" | "settings"

const ProjectDetails = memo(() => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const viewModel = useProjectDetailViewModel(projectId || "")
  const cloudSync = useProjectCloudSync(
    projectId || "",
    viewModel.refreshData,
    viewModel.project?.config?.storage
  )

  const stats = viewModel.projectStats
  const { nextItemId, labelCounts, maxLabelCount } = useProjectDetailDerivations({
    projectId,
    items: viewModel.images,
    annotations: viewModel.annotations,
    labels: viewModel.labels,
  })

  const goToNextItem = () => {
    if (nextItemId) viewModel.navigateToItem(nextItemId)
  }

  // Import an annotated dataset folder (format auto-detected or forced) and
  // report what landed.
  const handleImportDataset = async (format: DatasetImportFormat = "auto") => {
    try {
      const result = await viewModel.importDataset(format)
      if (!result) return
      toast.success(
        `Imported ${result.itemCount} images · ${result.annotationCount} boxes · ${result.createdClassCount} new classes (${result.format.toUpperCase()})`,
        {
          description: result.warnings.length
            ? `${result.warnings.length} item(s) were skipped — open the console for details.`
            : "Switch to the Images tab to keep labeling, or Model to train on them.",
        }
      )
      if (result.warnings.length) {
        console.warn("Dataset import warnings:", result.warnings)
      }
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ProjectDetailHeader
        project={viewModel.project}
        projectName={viewModel.projectName}
        onBack={viewModel.navigateBack}
        actions={
          <ProjectToolbar
            isVideoProject={viewModel.project?.modality === "video"}
            onOpenVideoEditor={viewModel.openVideoEditor}
            onRefresh={viewModel.refreshData}
            isLoading={viewModel.isLoading}
            cloudTargetName={cloudSync.activeConfig?.name}
            isSyncing={cloudSync.isSyncing}
            onPush={cloudSync.pushToCloud}
            onPull={cloudSync.pullFromCloud}
            onEdit={viewModel.openEditProjectModal}
            labelingCta={labelingCtaLabel(stats.progress, stats.annotatedImages)}
            canLabel={Boolean(nextItemId)}
            onStartLabeling={goToNextItem}
          />
        }
      />

      {viewModel.isLoading ? (
        <ProjectDetailLoading />
      ) : viewModel.error ? (
        <ProjectDetailError
          error={viewModel.error}
          onRetry={viewModel.loadProjectData}
        />
      ) : (
        <>
          <ProjectStatsGrid stats={stats} />

          <LabelingProgressCard
            annotatedItems={stats.annotatedImages}
            totalItems={stats.totalItems}
            progress={stats.progress}
          />

          <Tabs
            value={viewModel.activeTab}
            onValueChange={(value) => viewModel.setActiveTab(value as DetailTab)}
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
              <TabsTrigger value="settings" className="ml-auto gap-1.5">
                <Settings className="size-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="flex flex-col gap-4">
              <TabHeading
                title="Items"
                actions={<Badge variant="secondary">{stats.totalItems} total</Badge>}
              />
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
              <ClassesTab
                labels={viewModel.labels}
                labelCounts={labelCounts}
                maxLabelCount={maxLabelCount}
                totalLabels={stats.totalLabels}
                isMutating={viewModel.isCreatingLabel}
                onAddClass={viewModel.openAddLabelModal}
                onDeleteClass={viewModel.deleteLabel}
              />
            </TabsContent>

            <TabsContent value="upload" className="flex flex-col gap-4">
              <AddDataTab
                viewModel={viewModel}
                modality={(viewModel.project?.modality ?? "image") as DataKind}
                onImportDataset={handleImportDataset}
              />
            </TabsContent>

            <TabsContent value="training" className="flex flex-col gap-4">
              <ModelTab
                projectId={projectId}
                annotatedItems={stats.annotatedImages}
                totalItems={stats.totalItems}
                onTrain={() => navigate(`/projects/train/${projectId}`)}
                onContinueLabeling={goToNextItem}
              />
            </TabsContent>

            <TabsContent value="settings" className="flex flex-col gap-4">
              <TabHeading
                title="Project settings"
                description="Per-project configuration — labeling behavior, export defaults, and AI preferences that apply only to this dataset."
              />
              <ProjectSettingsTab
                project={viewModel.project}
                onSaved={viewModel.refreshData}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

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
