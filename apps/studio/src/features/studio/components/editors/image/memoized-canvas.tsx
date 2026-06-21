import { memo } from "react"
import { Canvas } from "@/features/studio/components/canvas/canvas"
import type { Annotation, Item, Label, Prediction } from "@/shared/types/core"
import type { PipelinePrompt } from "@/shared/ipc/studio"

interface MemoizedCanvasProps {
  image: Item
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
  }) => Promise<unknown>
  onUpdateAnnotation: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<unknown>
  onDeleteAnnotation: (annotationId: string) => Promise<void>
  onUndo: () => Promise<void> | void
  onRedo: () => Promise<void> | void
  onSmartSegment: (prompt: PipelinePrompt) => void | Promise<void>
  onAcceptPrediction: (predictionId: string) => void | Promise<unknown>
  onRejectPrediction: (predictionId: string) => void | Promise<unknown>
}

// Memo boundary around the canvas so canvas re-renders are driven only by its
// own props, not by the image editor's local UI state (copilot toggle, etc.).
export const MemoizedCanvas = memo(
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
    onAcceptPrediction,
    onRejectPrediction,
  }: MemoizedCanvasProps) => (
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
      onAcceptPrediction={onAcceptPrediction}
      onRejectPrediction={onRejectPrediction}
    />
  )
)

MemoizedCanvas.displayName = "MemoizedCanvas"
