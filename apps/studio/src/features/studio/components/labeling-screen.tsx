import { createElement, Fragment, memo, Suspense, useCallback, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { usePredictionBatchActions } from "@/features/studio/components/ai/use-prediction-batch-actions"
import { orderLabelsForPalette } from "@/features/studio/model/lib/label-palette"
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
/** Shown while a lazily loaded editor body downloads. */
const EditorLoading = () => (
  <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="size-4 animate-spin" />
    Loading editor…
  </div>
)

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

    // Batch review (Copilot tab + the canvas review bar share the same toasts).
    const batch = usePredictionBatchActions(viewModel)

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
            "Select a shape first (M), then choose a class to change it."
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
          .then(() => toast.success(`Changed to “${label.name}”.`))
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

    // Class management from the palette. Deleting the armed class disarms it.
    const handleDeleteLabel = useCallback(
      async (labelId: string) => {
        await viewModel.deleteLabel(labelId)
        if (viewModel.activeLabelId === labelId) viewModel.setActiveLabelId(null)
      },
      [viewModel.deleteLabel, viewModel.activeLabelId, viewModel.setActiveLabelId]
    )
    const handleClearActive = useCallback(
      () => viewModel.setActiveLabelId(null),
      [viewModel.setActiveLabelId]
    )

    // Shapes per class on this item (by label id, falling back to name), shown
    // as "×3" in the palette so progress is visible at a glance.
    const shapeCounts = useMemo(() => {
      const idByName = new Map(
        viewModel.data.labels.map((label) => [label.name, label.id])
      )
      const counts = new Map<string, number>()
      for (const annotation of viewModel.data.annotations) {
        const id =
          annotation.labelId || annotation.label_id || idByName.get(annotation.name)
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      return counts
    }, [viewModel.data.annotations, viewModel.data.labels])

    // Hotkeys index classes in palette display order so "3" is the class
    // showing "3" in the panel.
    const paletteLabels = useMemo(
      () => orderLabelsForPalette(viewModel.data.labels),
      [viewModel.data.labels]
    )

    // ←/→ navigate items, 1–9 arm the Nth class, Shift+1–9 relabels the
    // selected shape, Esc/0 clears the active class.
    useLabelHotkeys({
      labels: paletteLabels,
      onRelabelSelected: viewModel.selectedAnnotation ? handleLabelAssign : undefined,
      isShapeSelected: !!viewModel.selectedAnnotation,
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

          {/* Editor + right panel remount when the item changes (fresh per-item
              state), while the file list (above) stays mounted — so navigating
              between files no longer re-renders the whole screen, but the editor
              and panels still fully update to the new item. */}
          <Fragment key={itemId}>
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <Suspense fallback={<EditorLoading />}>
              {/* Registry entries are module-level components (some lazy), so
                  the element type is stable across renders. */}
              {createElement(editorFor(capabilities.editor), { viewModel, capabilities })}
            </Suspense>
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
                modality={capabilities.modality}
                task={capabilities.task}
                labels={viewModel.data.labels}
                activeLabelId={viewModel.activeLabelId}
                selectedLabelId={selectedShapeLabelId}
                hasSelectedShape={!!viewModel.selectedAnnotation}
                isLoading={viewModel.data.isLoading}
                onLabelSelect={handleLabelSelect}
                onLabelAssign={handleLabelAssign}
                onClearActive={handleClearActive}
                onCreateLabel={viewModel.createLabel}
                onUpdateLabel={viewModel.updateLabel}
                onDeleteLabel={handleDeleteLabel}
                shapeCounts={shapeCounts}
                annotations={viewModel.data.annotations}
                selectedAnnotationId={viewModel.selectedAnnotation?.id ?? null}
                onSelectAnnotation={viewModel.setSelectedAnnotation}
                onDeleteAnnotation={(id) => void viewModel.deleteAnnotation(id)}
                predictions={viewModel.data.predictions}
                onAcceptAllPredictions={batch.acceptAll}
                onRejectAllPredictions={batch.rejectAll}
                projectId={viewModel.effectiveProjectId}
                itemId={viewModel.data.item?.id}
                itemName={viewModel.data.item?.name}
              />
            </ResizablePanel>
          )}
          </Fragment>
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
          task={capabilities.task}
        />
      </div>
    )
  }
)

LabelingScreen.displayName = "LabelingScreen"
