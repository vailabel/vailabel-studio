import { memo, useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { LabelListPanel } from "@/components/studio/label-list-panel"
import { FileListPanel } from "@/components/studio/file-list-panel"
import { ResizablePanel } from "@/components/common/resizable-panel"
import { SettingsModal } from "@/components/settings/settings-modal"
import { ExportDialog } from "@/components/studio/export-dialog"
import { StudioHeader } from "@/components/studio/common/studio-header"
import { StudioBottomBar } from "@/components/studio/common/studio-bottom-bar"
import { editorFor } from "@/components/studio/editors/editor-registry"
import { useStudioScreenViewModel } from "@/features/studio/use-studio-screen-viewmodel"
import { useLabelHotkeys } from "@/hooks/use-label-hotkeys"
import { resolveCapabilities } from "@/lib/labeling-config"
import type { Label } from "@/types/core"

interface LabelingScreenProps {
  projectId?: string
  imageId?: string
}

// The modality-agnostic labeling shell: it resolves the project's capabilities,
// lays out the shared chrome (header, file list, label palette, bottom bar), and
// mounts the editor body for the resolved editor kind. Each editor owns the
// center pane; everything around it is reused across templates.
export const LabelingScreen = memo(
  ({ projectId, imageId }: LabelingScreenProps) => {
    const [showExportDialog, setShowExportDialog] = useState(false)
    const viewModel = useStudioScreenViewModel(projectId, imageId)

    const capabilities = useMemo(
      () =>
        resolveCapabilities({
          modality: viewModel.project?.modality,
          task: viewModel.project?.task,
          projectType: viewModel.project?.type,
        }),
      [
        viewModel.project?.modality,
        viewModel.project?.task,
        viewModel.project?.type,
      ]
    )

    const EditorBody = editorFor(capabilities.editor)

    // Single click (and 1–9) ARMS the class new annotations inherit.
    const handleLabelSelect = useCallback(
      (label: Label) => {
        viewModel.setActiveLabelId(label.id)
      },
      [viewModel.setActiveLabelId]
    )

    // Double click RELABELS the currently selected annotation.
    const handleLabelAssign = useCallback(
      (label: Label) => {
        viewModel.setActiveLabelId(label.id)
        const selected = viewModel.selectedAnnotation
        if (!selected) {
          toast.info(
            "Select a shape first, then double-click a class to relabel it."
          )
          return
        }
        if ((selected.labelId || selected.label_id) === label.id) return
        void viewModel
          .updateAnnotation(selected.id, {
            name: label.name,
            color: label.color,
            labelId: label.id,
            label_id: label.id,
          })
          .then(() => toast.success(`Relabeled to “${label.name}”.`))
          .catch(() => toast.error("Couldn't relabel the shape."))
      },
      [
        viewModel.setActiveLabelId,
        viewModel.updateAnnotation,
        viewModel.selectedAnnotation,
      ]
    )

    // The class the selected annotation belongs to (by id, falling back to name).
    const selectedShapeLabelId = useMemo(() => {
      const selected = viewModel.selectedAnnotation
      if (!selected) return null
      const direct = selected.labelId || selected.label_id
      if (direct) return direct
      return (
        viewModel.data.labels.find((entry) => entry.name === selected.name)
          ?.id ?? null
      )
    }, [viewModel.selectedAnnotation, viewModel.data.labels])

    // ←/→ navigate items, 1–9 arm the Nth class, Esc/0 clears it.
    useLabelHotkeys({
      labels: viewModel.data.labels,
      activeLabelId: viewModel.activeLabelId,
      setActiveLabelId: viewModel.setActiveLabelId,
      onNextImage: viewModel.goToNextImage,
      onPreviousImage: viewModel.goToPreviousImage,
      onToggleCrosshair: viewModel.toggleCrosshair,
      onToggleCoordinates: viewModel.toggleCoordinates,
      onToggleRuler: viewModel.toggleRuler,
    })

    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-muted text-foreground">
        <StudioHeader
          projectName={viewModel.project?.name || "Project"}
          projectStats={viewModel.projectStats}
          isLoading={viewModel.isProjectSummaryLoading}
          onBack={viewModel.navigateBackToProjects}
          onOpenSettings={viewModel.openSettingsModal}
          onExport={() => setShowExportDialog(true)}
          isExporting={viewModel.isExporting}
        />

        <div className="flex flex-1 overflow-hidden">
          {capabilities.chrome.showFileList && (
            <ResizablePanel
              direction="horizontal"
              controlPosition="right"
              defaultSize={240}
              minSize={180}
              maxSize={360}
              className="h-full"
            >
              <FileListPanel
                images={viewModel.projectImages}
                currentImageId={viewModel.currentImageId}
                annotatedImageIds={viewModel.annotatedImageIds}
                onSelectImage={viewModel.navigateToImage}
                isLoading={viewModel.isProjectSummaryLoading}
              />
            </ResizablePanel>
          )}

          <div className="relative flex flex-1 flex-col overflow-hidden">
            <EditorBody viewModel={viewModel} capabilities={capabilities} />
            {capabilities.chrome.showBottomBar && (
              <StudioBottomBar
                currentImageIndex={viewModel.currentImageIndex}
                projectStats={viewModel.projectStats}
                hasNext={viewModel.hasNext}
                hasPrevious={viewModel.hasPrevious}
                onNext={viewModel.goToNextImage}
                onPrevious={viewModel.goToPreviousImage}
              />
            )}
          </div>

          {capabilities.chrome.showLabelPalette && (
            <ResizablePanel
              direction="horizontal"
              controlPosition="left"
              defaultSize={280}
              minSize={200}
              maxSize={400}
              className="h-full"
            >
              <LabelListPanel
                onLabelSelect={handleLabelSelect}
                onLabelAssign={handleLabelAssign}
                selectedLabelId={selectedShapeLabelId}
                hasSelectedShape={!!viewModel.selectedAnnotation}
                labels={viewModel.data.labels}
                activeLabelId={viewModel.activeLabelId}
                isLoading={viewModel.data.isLoading}
              />
            </ResizablePanel>
          )}
        </div>

        {viewModel.showSettingsModal ? (
          <SettingsModal onClose={viewModel.closeSettingsModal} />
        ) : null}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={viewModel.exportProject}
          isExporting={viewModel.isExporting}
          modality={capabilities.modality}
        />
      </div>
    )
  }
)

LabelingScreen.displayName = "LabelingScreen"
