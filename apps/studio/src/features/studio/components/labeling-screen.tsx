import { memo, useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { StudioRightPanel } from "@/features/studio/components/right-panel/studio-right-panel"
import { FileListPanel } from "@/features/studio/components/file-list-panel"
import { ResizablePanel } from "@/features/studio/components/common/resizable-panel"
import { SettingsModal } from "@/features/studio/components/settings-modal"
import { ExportDialog } from "@/features/studio/components/export-dialog"
import { StudioHeader } from "@/features/studio/components/common/studio-header"
import { StudioBottomBar } from "@/features/studio/components/common/studio-bottom-bar"
import { editorFor } from "@/features/studio/components/editors/editor-registry"
import { useStudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"
import { useLabelHotkeys } from "@/features/studio/hooks/use-label-hotkeys"
import { resolveCapabilities } from "@/features/studio/model/lib/labeling-config"
import type { Label } from "@/shared/types/core"

interface LabelingScreenProps {
  projectId?: string
  itemId?: string
}

// The modality-agnostic labeling shell: it resolves the project's capabilities,
// lays out the shared chrome (header, file list, label palette, bottom bar), and
// mounts the editor body for the resolved editor kind. Each editor owns the
// center pane; everything around it is reused across templates.
export const LabelingScreen = memo(
  ({ projectId, itemId }: LabelingScreenProps) => {
    const [showExportDialog, setShowExportDialog] = useState(false)
    const viewModel = useStudioScreenViewModel(projectId, itemId)

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

    // Auto-label: run the picked detection model on the current image; results
    // land in the AI tab's prediction-review list. Owns the user feedback since
    // the view model's generatePredictions just returns the created suggestions.
    const handleAutoLabel = useCallback(
      async (modelId: string, threshold: number) => {
        try {
          const created = await viewModel.generatePredictions(modelId, threshold)
          if (created.length > 0) {
            toast.success(
              `Auto-label found ${created.length} object${created.length === 1 ? "" : "s"} — review them in the AI tab.`
            )
          } else {
            toast.info(
              `No objects found at ${Math.round(threshold * 100)}% confidence. Lower the Conf slider, or try another image or model.`
            )
          }
        } catch (error) {
          toast.error(
            `Auto-label failed: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      },
      [viewModel.generatePredictions]
    )

    // Submit/Update (Label Studio task completion). Work already autosaves, so
    // this is a UI-only "mark done & advance": confirm, then move to the next
    // item when there is one.
    const handleSubmit = useCallback(() => {
      toast.success(viewModel.hasNext ? "Submitted — next item" : "Submitted")
      if (viewModel.hasNext) viewModel.goToNextItem()
    }, [viewModel.hasNext, viewModel.goToNextItem])

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
      onNextImage: viewModel.goToNextItem,
      onPreviousImage: viewModel.goToPreviousItem,
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
              maxSize={420}
              storageKey="studio-file-list-width"
              className="h-full"
            >
              <FileListPanel
                images={viewModel.projectItems}
                currentItemId={viewModel.currentItemId}
                annotatedItemIds={viewModel.annotatedItemIds}
                onSelectItem={viewModel.navigateToItem}
                isLoading={viewModel.isItemsLoading}
                total={viewModel.itemsTotal}
                searchValue={viewModel.itemSearch}
                onSearchChange={viewModel.setItemSearch}
                hasMore={viewModel.hasMoreItems}
                onLoadMore={viewModel.loadMoreItems}
              />
            </ResizablePanel>
          )}

          <div className="relative flex flex-1 flex-col overflow-hidden">
            <EditorBody viewModel={viewModel} capabilities={capabilities} />
            {capabilities.chrome.showBottomBar && (
              <StudioBottomBar
                currentItemIndex={viewModel.currentItemIndex}
                projectStats={viewModel.projectStats}
                hasNext={viewModel.hasNext}
                hasPrevious={viewModel.hasPrevious}
                isCurrentLabeled={viewModel.data.annotations.length > 0}
                onPrevious={viewModel.goToPreviousItem}
                onSkip={viewModel.goToNextItem}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          {capabilities.chrome.showLabelPalette && (
            <ResizablePanel
              direction="horizontal"
              controlPosition="left"
              defaultSize={380}
              minSize={300}
              maxSize={680}
              storageKey="studio-right-panel-width"
              className="h-full"
            >
              <StudioRightPanel
                isImageEditor={capabilities.editor === "canvas"}
                labels={viewModel.data.labels}
                activeLabelId={viewModel.activeLabelId}
                selectedLabelId={selectedShapeLabelId}
                hasSelectedShape={!!viewModel.selectedAnnotation}
                isLoading={viewModel.data.isLoading}
                onLabelSelect={handleLabelSelect}
                onLabelAssign={handleLabelAssign}
                annotations={viewModel.data.annotations}
                selectedAnnotationId={viewModel.selectedAnnotation?.id ?? null}
                onSelectAnnotation={viewModel.setSelectedAnnotation}
                onDeleteAnnotation={(id) => void viewModel.deleteAnnotation(id)}
                aiModels={viewModel.data.aiModels}
                isGeneratingPredictions={viewModel.isGeneratingPredictions}
                onAutoLabel={handleAutoLabel}
                predictions={viewModel.data.predictions}
                onAcceptPrediction={viewModel.acceptPrediction}
                onRejectPrediction={viewModel.rejectPrediction}
                projectId={viewModel.effectiveProjectId}
                itemId={viewModel.data.item?.id}
                imageName={viewModel.data.item?.name}
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
