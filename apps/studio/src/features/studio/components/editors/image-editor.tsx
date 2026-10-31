import { memo, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Toolbar } from "@/features/studio/components/toolbar"
import { ToolRail } from "@/features/studio/components/tool-rail"
import { ClassificationPanel } from "@/features/studio/components/classification-panel"
import { ContextMenu } from "@/features/studio/components/context-menu"
import { useClassification } from "@/features/studio/components/common/use-classification"
import { ShortcutsDialog } from "@/features/studio/components/common/shortcuts-dialog"
import { PredictionReviewBar } from "@/features/studio/components/ai/prediction-review-bar"
import { usePredictionBatchActions } from "@/features/studio/components/ai/use-prediction-batch-actions"
import type { EditorProps } from "./types"
import { MemoizedCanvas } from "./image/memoized-canvas"
import { EmptyImageState } from "./image/empty-image-state"
import { useImageEditorActions } from "./image/use-image-editor-actions"

// Image editor body: the canvas plus its toolbar (active class, AI auto-label,
// shortcuts), the tool rail, the context menu, the AI review bar shown while
// suggestions are waiting, and (for image-classification projects) the
// whole-image class bar. The Copilot lives as a docked tab in the right panel.
// Mounted by the shell for the "canvas" and "classification" editor kinds.
export const ImageEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const classification = useClassification(viewModel)
  const actions = useImageEditorActions(viewModel)
  const batch = usePredictionBatchActions(viewModel)
  const [showShortcuts, setShowShortcuts] = useState(false)
  // Class picker only matters when shapes can be drawn; the detector draws
  // boxes, so auto-label is offered where boxes are a valid answer.
  const hasDrawingTools = capabilities.tools.some(
    (tool) => tool !== "move" && tool !== "delete"
  )
  const supportsBoxes = capabilities.tools.includes("box")

  // `?` opens the shortcuts sheet (skipped while typing in a field).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      setShowShortcuts((open) => !open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div
      role="button"
      ref={actions.canvasContainerRef}
      className="relative flex flex-1 flex-col overflow-hidden"
      onContextMenu={actions.handleContextMenu}
      onClick={viewModel.closeContextMenu}
    >
      <Toolbar
        zoom={viewModel.zoom}
        onZoomIn={viewModel.zoomIn}
        onZoomOut={viewModel.zoomOut}
        onResetView={viewModel.resetView}
        showCrosshair={viewModel.showCrosshair}
        showCoordinates={viewModel.showCoordinates}
        showRuler={viewModel.showRuler}
        onToggleCrosshair={viewModel.toggleCrosshair}
        onToggleCoordinates={viewModel.toggleCoordinates}
        onToggleRuler={viewModel.toggleRuler}
        canUndo={viewModel.canUndo}
        canRedo={viewModel.canRedo}
        onUndo={viewModel.undo}
        onRedo={viewModel.redo}
        labels={hasDrawingTools ? viewModel.data.labels : undefined}
        activeLabelId={viewModel.activeLabelId}
        onActiveLabelChange={viewModel.setActiveLabelId}
        detectors={viewModel.data.aiModels}
        isAutoLabeling={viewModel.isGeneratingPredictions}
        canAutoLabel={!!viewModel.data.item}
        onAutoLabel={supportsBoxes ? actions.autoLabel : undefined}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      <div className="flex min-h-0 flex-1">
        <ToolRail
          allowedTools={capabilities.tools}
          selectedTool={viewModel.selectedTool}
          onSelectTool={viewModel.setSelectedTool}
        />
        <div className="relative flex-1 overflow-hidden">
        {viewModel.data.item ? (
          <MemoizedCanvas
            image={viewModel.data.item}
            annotations={viewModel.data.annotations}
            predictions={viewModel.data.predictions}
            labels={viewModel.data.labels}
            activeLabel={viewModel.activeLabel}
            onCreateAnnotationDraft={viewModel.createAnnotationFromDraft}
            onUpdateAnnotation={viewModel.updateAnnotation}
            onDeleteAnnotation={viewModel.deleteAnnotation}
            onUndo={viewModel.undo}
            onRedo={viewModel.redo}
            onSmartSegment={viewModel.smartSegment}
            onActivateLabel={viewModel.setActiveLabelId}
            onAcceptPrediction={viewModel.acceptPrediction}
            onRejectPrediction={viewModel.rejectPrediction}
          />
        ) : (
          <EmptyImageState />
        )}

        {viewModel.isSegmenting || viewModel.isGeneratingPredictions ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-sm font-medium shadow-lg backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>
              {viewModel.isSegmenting ? "AI is tracing the object…" : "AI is labeling this image…"}
            </span>
          </div>
        ) : viewModel.data.item ? (
          <PredictionReviewBar
            predictions={viewModel.data.predictions}
            onAcceptAll={batch.acceptAll}
            onRejectAll={batch.rejectAll}
          />
        ) : null}

        {capabilities.allowsClassification && viewModel.data.item ? (
          <ClassificationPanel
            labels={viewModel.data.labels}
            active={classification.annotation}
            onAssign={(label) => void classification.assign(label)}
            onClear={() => void classification.clear()}
            title="Image class"
          />
        ) : null}

        {viewModel.contextMenu.visible ? (
          <ContextMenu
            x={viewModel.contextMenu.x}
            y={viewModel.contextMenu.y}
            onSelectTool={viewModel.setSelectedTool}
            onResetView={viewModel.resetView}
            canSimplify={viewModel.canSimplifySelected}
            onSimplify={() => void viewModel.simplifySelectedAnnotation()}
            containerRect={
              actions.canvasContainerRef.current?.getBoundingClientRect() || null
            }
            onClose={viewModel.closeContextMenu}
          />
        ) : null}
        </div>
      </div>

      <ShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
        allowedTools={capabilities.tools}
      />
    </div>
  )
})

ImageEditor.displayName = "ImageEditor"
