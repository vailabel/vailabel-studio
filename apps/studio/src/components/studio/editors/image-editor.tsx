import { memo, useCallback, useRef, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Canvas } from "@/components/canvas/canvas"
import { Toolbar } from "@/components/studio/toolbar"
import { ClassificationPanel } from "@/components/studio/classification-panel"
import { ContextMenu } from "@/components/studio/context-menu"
import { PredictionReviewPanel } from "@/components/ai/prediction-review-panel"
import { AiCopilotPanel } from "@/components/ai/ai-copilot-panel"
import { AutoLabelControls } from "@/components/ai/auto-label-controls"
import { useClassification } from "@/components/studio/common/use-classification"
import type { Annotation, ImageData, Label, Prediction } from "@/types/core"
import type { PipelinePrompt } from "@/ipc/studio"
import type { EditorProps } from "./types"

// Image editor body: the canvas plus its toolbar, AI auto-label / copilot,
// prediction review, context menu, and (for image-classification projects) the
// whole-image class bar. Mounted by the shell for "canvas" and "classification"
// editor kinds.
export const ImageEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [showCopilot, setShowCopilot] = useState(false)
  const classification = useClassification(viewModel)

  // Smart Segment (SAM): the tool handler voids the promise, so surface the
  // outcome here — otherwise a failed/empty run silently does nothing.
  const handleSmartSegment = useCallback(
    async (prompt: PipelinePrompt) => {
      const outcome = await viewModel.smartSegment(prompt)
      if (outcome.status === "ok") {
        if (outcome.count > 0) {
          toast.success(
            `Segmented ${outcome.count} object${outcome.count === 1 ? "" : "s"} — review it on the canvas.`
          )
        } else {
          toast.info(
            "SAM didn't return a shape there. Click the center of the object, or drag a box around it."
          )
        }
      } else if (outcome.status === "no-model") {
        toast.error(
          "No SAM model installed. Install “Segment Anything (SAM)” on the AI Models page first."
        )
      } else {
        toast.error(`Smart Segment failed: ${outcome.message}`)
      }
    },
    [viewModel.smartSegment]
  )

  // Auto-label: run the picked detection model on the current image; suggestions
  // land in the review panel where each label can be edited before accepting.
  const handleAutoLabel = useCallback(
    async (modelId: string, threshold: number) => {
      try {
        const created = await viewModel.generatePredictions(modelId, threshold)
        if (created.length > 0) {
          toast.success(
            `Auto-label found ${created.length} object${created.length === 1 ? "" : "s"} — review them on the right.`
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

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect()
        viewModel.setContainer({ width: rect.width, height: rect.height })
      }
      viewModel.openContextMenu({ x: event.clientX, y: event.clientY })
      return false
    },
    [viewModel]
  )

  return (
    <div
      role="button"
      ref={canvasContainerRef}
      className="relative flex flex-1 flex-col overflow-hidden"
      onContextMenu={handleContextMenu}
      onClick={viewModel.closeContextMenu}
    >
      <Toolbar
        allowedTools={capabilities.tools}
        aiSlot={
          <AutoLabelControls
            models={viewModel.data.aiModels}
            isRunning={viewModel.isGeneratingPredictions}
            onAutoLabel={handleAutoLabel}
          />
        }
        selectedTool={viewModel.selectedTool}
        onSelectTool={viewModel.setSelectedTool}
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

      <div className="relative flex-1 overflow-hidden">
        {viewModel.data.image ? (
          <MemoizedCanvas
            image={viewModel.data.image}
            annotations={viewModel.data.annotations}
            predictions={viewModel.data.predictions}
            labels={viewModel.data.labels}
            activeLabel={viewModel.activeLabel}
            onCreateAnnotationDraft={viewModel.createAnnotationFromDraft}
            onUpdateAnnotation={viewModel.updateAnnotation}
            onDeleteAnnotation={viewModel.deleteAnnotation}
            onUndo={viewModel.undo}
            onRedo={viewModel.redo}
            onSmartSegment={handleSmartSegment}
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

        <PredictionReviewPanel
          predictions={viewModel.data.predictions}
          labels={viewModel.data.labels}
          onAccept={viewModel.acceptPrediction}
          onReject={viewModel.rejectPrediction}
          offset={showCopilot}
        />

        {capabilities.allowsClassification && viewModel.data.image ? (
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
              canvasContainerRef.current?.getBoundingClientRect() || null
            }
            onClose={viewModel.closeContextMenu}
          />
        ) : null}

        {!showCopilot && (
          <Button
            size="sm"
            className="absolute bottom-4 right-4 z-20 gap-1.5 shadow-lg"
            onClick={() => setShowCopilot(true)}
          >
            <Sparkles className="h-4 w-4" />
            AI Copilot
          </Button>
        )}
        {showCopilot && (
          <AiCopilotPanel
            key={viewModel.data.image?.id}
            projectId={viewModel.effectiveProjectId}
            imageId={viewModel.data.image?.id}
            imageName={viewModel.data.image?.name}
            onClose={() => setShowCopilot(false)}
          />
        )}
      </div>
    </div>
  )
})

ImageEditor.displayName = "ImageEditor"

const MemoizedCanvas = memo(
  ({
    image,
    annotations,
    predictions,
    labels,
    activeLabel,
    onCreateAnnotationDraft,
    onUpdateAnnotation,
    onDeleteAnnotation,
    onUndo,
    onRedo,
    onSmartSegment,
  }: {
    image: ImageData
    annotations: Annotation[]
    predictions: Prediction[]
    labels: Label[]
    activeLabel: Label | null
    onCreateAnnotationDraft: (draft: {
      name: string
      color: string
      type: string
      coordinates: Array<{ x: number; y: number }>
      labelId?: string
    }) => Promise<void>
    onUpdateAnnotation: (
      annotationId: string,
      updates: Partial<Annotation>
    ) => Promise<void>
    onDeleteAnnotation: (annotationId: string) => Promise<void>
    onUndo: () => Promise<void> | void
    onRedo: () => Promise<void> | void
    onSmartSegment: (prompt: PipelinePrompt) => void | Promise<void>
  }) => (
    <Canvas
      image={image}
      annotations={annotations}
      predictions={predictions}
      labels={labels}
      activeLabel={activeLabel}
      onCreateAnnotationDraft={onCreateAnnotationDraft}
      onUpdateAnnotation={onUpdateAnnotation}
      onDeleteAnnotation={onDeleteAnnotation}
      onUndo={onUndo}
      onRedo={onRedo}
      onSmartSegment={onSmartSegment}
    />
  )
)

MemoizedCanvas.displayName = "MemoizedCanvas"

const EmptyImageState = memo(() => (
  <div className="flex h-full items-center justify-center bg-muted">
    <p className="text-muted-foreground">No images in this project</p>
  </div>
))

EmptyImageState.displayName = "EmptyImageState"
