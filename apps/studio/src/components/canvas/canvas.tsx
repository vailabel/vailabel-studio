import { memo, useCallback, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers-context"
import { type Annotation, type ImageData, type Label } from "@vailabel/core"
import { Crosshair } from "@/components/canvas/crosshair-context"
import { CreateAnnotation } from "@/components/canvas/create-annotation"
import {
  useCanvasPan,
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import { TempAnnotation } from "./temp-annotation"
import { ToolStatus } from "./tool-status"
import { Prediction } from "@vailabel/core"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
  predictions?: Prediction[]
  labels: Label[]
  onCreateAnnotationDraft: (draft: {
    name: string
    color: string
    type: string
    coordinates: Array<{ x: number; y: number }>
  }) => Promise<void>
  onUpdateAnnotation: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
  onDeleteAnnotation: (annotationId: string) => Promise<void>
  onRefreshAnnotations?: () => Promise<void>
}

// Memoize the image component to prevent unnecessary re-renders
const CanvasImage = memo(({ image }: { image: ImageData }) => (
  <img
    src={image.data}
    alt="Canvas"
    className="pointer-events-none select-none"
    draggable={false}
    width={image.width}
    height={image.height}
    style={{
      width: `${image.width}px`,
      height: `${image.height}px`,
      maxWidth: "none",
      maxHeight: "none",
      objectFit: "none",
    }}
  />
))

CanvasImage.displayName = "CanvasImage"

// Memoize empty state component
const EmptyImageState = memo(() => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center">
      <p className="text-lg font-medium text-gray-500 dark:text-gray-300">
        No image loaded
      </p>
    </div>
  </div>
))

EmptyImageState.displayName = "EmptyImageState"

export const Canvas = memo(
  ({
    image,
    annotations,
    predictions = [],
    labels,
    onCreateAnnotationDraft,
    onUpdateAnnotation,
    onDeleteAnnotation,
    onRefreshAnnotations,
  }: CanvasProps) => {
    // Use Context hooks instead of Zustand
    const { zoom } = useCanvasZoom()
    const { panOffset } = useCanvasPan()
    const { selectedTool, setToolState } = useCanvasTool()
    const { setSelectedAnnotation } = useCanvasSelection()

    const canvasRef = useRef<HTMLDivElement | null>(null)

    // Get all handler props
    const handlerState = useCanvasHandlers(
      canvasRef,
      annotations,
      {
        updateAnnotation: onUpdateAnnotation,
        deleteAnnotation: onDeleteAnnotation,
      },
      { id: image.id }
    )
    const {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleDoubleClick,
      isPanning,
      // ...other UI state
    } = handlerState

    // Safely extract tempAnnotation and showLabelInput if present
    const tempAnnotation =
      "tempAnnotation" in handlerState ? handlerState.tempAnnotation : undefined
    const showLabelInput =
      "showLabelInput" in handlerState ? handlerState.showLabelInput : undefined
    // Extract resize and move state for preview coordinates
    const resizingAnnotationId =
      "resizingAnnotationId" in handlerState
        ? handlerState.resizingAnnotationId
        : null
    const movingAnnotationId =
      "movingAnnotationId" in handlerState
        ? handlerState.movingAnnotationId
        : null
    const previewCoordinates =
      "previewCoordinates" in handlerState
        ? handlerState.previewCoordinates
        : null

    // Create annotations array with preview coordinates for resizing or moving annotation
    // Optimize this with shallow comparison to prevent unnecessary re-computation
    const displayAnnotations = useMemo(() => {
      if (previewCoordinates && (resizingAnnotationId || movingAnnotationId)) {
        const targetId = resizingAnnotationId || movingAnnotationId
        return annotations.map((annotation) =>
          annotation.id === targetId
            ? { ...annotation, coordinates: previewCoordinates }
            : annotation
        )
      }
      return annotations
    }, [
      annotations,
      resizingAnnotationId,
      movingAnnotationId,
      previewCoordinates,
    ])

    const handleCreateAnnotation = useCallback(
      async (name: string, color: string) => {
        if (!tempAnnotation) return

        try {
          await onCreateAnnotationDraft({
            name: name,
            type: tempAnnotation.type ?? "box",
            coordinates: tempAnnotation.coordinates ?? [],
            color,
          })

          // Clear tool state after successful creation
          setToolState({
            showLabelInput: false,
            tempAnnotation: null,
            resizingAnnotationId: null,
            movingAnnotationId: null,
            previewCoordinates: null,
            polygonPoints: [], // Clear polygon points for fresh start
          })

          // Select the newly created annotation so it can be moved immediately
          setSelectedAnnotation(null)
        } catch (error) {
          console.error("Failed to create annotation:", error)
        }
      },
      [
        tempAnnotation,
        onCreateAnnotationDraft,
        setToolState,
        setSelectedAnnotation,
      ]
    )

    const handleCloseCreateAnnotationModal = useCallback(() => {
      setToolState({
        showLabelInput: false,
        tempAnnotation: null,
        polygonPoints: [], // Clear polygon points when canceling
      })
    }, [setToolState])

    // Canvas ref is now passed directly to handlers

    // Memoize cursor styles to prevent object recreation
    const cursorStyles = useMemo(
      () => ({
        box: "cursor-crosshair",
        polygon: "cursor-crosshair",
        freeDraw: "cursor-crosshair",
        move: "cursor-move",
        delete: "cursor-pointer",
      }),
      []
    )

    // Memoize cursor calculation to avoid recalculation on every render
    const canvasCursor = useMemo(() => {
      if (isPanning) return "cursor-grabbing"
      return (
        cursorStyles[selectedTool as keyof typeof cursorStyles] ||
        "cursor-default"
      )
    }, [isPanning, selectedTool, cursorStyles])

    // Memoize transform style to avoid string concatenation on every render
    const transformStyle = useMemo(
      () => ({
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        willChange: "transform", // Hint to browser for GPU acceleration
      }),
      [panOffset.x, panOffset.y, zoom]
    )

    // Memoize canvas classes to prevent className string recalculation
    const canvasClassName = useMemo(
      () => cn("relative h-full w-full overflow-hidden", canvasCursor),
      [canvasCursor]
    )

    // Memoize canvas container styles for better performance
    const canvasContainerStyle = useMemo(
      () => ({
        contain: "layout style paint", // CSS containment for better performance
        transform: "translateZ(0)", // Force GPU acceleration
        // Ensure container doesn't affect image size
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }),
      []
    )

    const predictionAnnotations = useMemo(
      () =>
        predictions.map((prediction) => ({
          ...prediction,
          color: prediction.labelColor || prediction.color || "#22c55e",
        })) as Annotation[],
      [predictions]
    )

    return (
      <>
        <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
          <div className="relative h-full w-full overflow-hidden">
            {!image ? (
              <EmptyImageState />
            ) : (
              <div
                data-testid="canvas"
                ref={canvasRef}
                className={canvasClassName}
                style={canvasContainerStyle}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDoubleClick={handleDoubleClick}
                role="button"
              >
                <div className="absolute" style={transformStyle}>
                  <CanvasImage image={image} />
                  {predictionAnnotations.length > 0 && (
                    <AnnotationRenderer
                      annotations={predictionAnnotations}
                      readOnly
                    />
                  )}
                  <AnnotationRenderer
                    annotations={displayAnnotations}
                    onUpdateAnnotation={onUpdateAnnotation}
                  />
                  {tempAnnotation && (
                    <TempAnnotation annotation={tempAnnotation} />
                  )}
                </div>

                <Crosshair canvasRef={canvasRef} />
                <PositionCoordinates />

                {/* Show tool status for all tools */}
                <ToolStatus
                  tool={selectedTool}
                  isVisible={!showLabelInput}
                  pointCount={
                    "polygonPoints" in handlerState
                      ? handlerState.polygonPoints?.length || 0
                      : 0
                  }
                  isDragging={
                    "isDragging" in handlerState
                      ? handlerState.isDragging
                      : false
                  }
                  isDrawing={
                    "isDrawing" in handlerState ? handlerState.isDrawing : false
                  }
                  isMoving={
                    "isMoving" in handlerState
                      ? (handlerState.isMoving as boolean)
                      : false
                  }
                  isResizing={
                    "isResizing" in handlerState
                      ? (handlerState.isResizing as boolean)
                      : false
                  }
                />
              </div>
            )}
          </div>
        </div>
        <CreateAnnotation
          labels={labels}
          onSubmit={handleCreateAnnotation}
          isOpen={!!showLabelInput}
          onClose={handleCloseCreateAnnotationModal}
        />
      </>
    )
  }
)
