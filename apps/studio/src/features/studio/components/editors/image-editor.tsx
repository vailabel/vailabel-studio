import { memo } from "react"
import { Loader2 } from "lucide-react"
import { Toolbar } from "@/features/studio/components/toolbar"
import { ToolRail } from "@/features/studio/components/tool-rail"
import { ClassificationPanel } from "@/features/studio/components/classification-panel"
import { ContextMenu } from "@/features/studio/components/context-menu"
import { useClassification } from "@/features/studio/components/common/use-classification"
import type { EditorProps } from "./types"
import { MemoizedCanvas } from "./image/memoized-canvas"
import { EmptyImageState } from "./image/empty-image-state"
import { useImageEditorActions } from "./image/use-image-editor-actions"

// Image editor body: the canvas plus its toolbar, the context menu, and (for
// image-classification projects) the whole-image class bar. AI auto-label,
// prediction review, and the Copilot now live as docked tabs in the studio's
// right panel — they no longer float over the canvas. Mounted by the shell for
// the "canvas" and "classification" editor kinds.
export const ImageEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const classification = useClassification(viewModel)
  const actions = useImageEditorActions(viewModel)

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
          />
        ) : (
          <EmptyImageState />
        )}

        {viewModel.isSegmenting && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-sm font-medium shadow-lg backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Segmenting…</span>
          </div>
        )}

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
    </div>
  )
})

ImageEditor.displayName = "ImageEditor"
