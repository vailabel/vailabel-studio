import { memo, useCallback, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/tools/canvas-handler"
import { type Annotation, type ImageData } from "@vailabel/core"
import { Crosshair } from "@/components/canvas/crosshair"
import { CreateAnnotation } from "@/components/canvas/create-annotation"
import { useAnnotationsStore } from "@/stores/annotation-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { useLabelStore } from "@/stores/use-label-store"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
}

export const Canvas = memo(({ image, annotations }: CanvasProps) => {
  const { zoom, panOffset, selectedTool, setCanvasRef } = useCanvasStore()
  const { createAnnotation } = useAnnotationsStore()
  const { getOrCreateLabel, labels } = useLabelStore()

  const canvasRef = useRef<HTMLDivElement | null>(null)

  // Get all handler props
  const handlerState = useCanvasHandlers()
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
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
      if (!image.projectId) return
      const label = await getOrCreateLabel(name, color, image.projectId)
      if (!label) return
      const newAnnotation: Annotation = {
        label: label,
        labelId: label.id,
        color: label.color ?? color,
        imageId: image.id,
        id: crypto.randomUUID(),
        name: name,
        type: tempAnnotation.type ?? "box",
        coordinates: tempAnnotation.coordinates ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      createAnnotation(newAnnotation)
      // Optionally: clear tempAnnotation and close modal if needed
      // setShowLabelInput(false); // If you have a setter for this
      // setTempAnnotation(null); // If you have a setter for this
    },
    [tempAnnotation, image, getOrCreateLabel, createAnnotation]
  )

  const handleCloseCreateAnnotationModal = useCallback(() => {
    // // Optionally: clear tempAnnotation and close modal if needed
    // setShowLabelInput(false); // If you have a setter for this
    // setTempAnnotation(null); // If you have a setter for this
  }, [])

  useEffect(() => {
    setCanvasRef(canvasRef)
  }, [setCanvasRef])

  const cursorStyles = {
    box: "cursor-crosshair",
    polygon: "cursor-crosshair",
    freeDraw: "cursor-crosshair",
    move: "cursor-move",
    delete: "cursor-pointer",
  }

  // Use 'grabbing' cursor when panning
  const canvasCursor = isPanning
    ? "cursor-grabbing"
    : cursorStyles[selectedTool as keyof typeof cursorStyles] ||
      "cursor-default"

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
        <div
          className="relative h-full w-full overflow-hidden"
          onWheel={handleWheel}
        >
          {!image ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-500 dark:text-gray-300">
                  No image loaded
                </p>
              </div>
            </div>
          ) : (
            <div
              data-testid="canvas"
              ref={canvasRef}
              className={cn(
                "relative h-full w-full overflow-hidden",
                canvasCursor
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              role="button"
            >
              <div
                className="absolute"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <img
                  src={image.data}
                  alt="Canvas"
                  className="pointer-events-none select-none"
                  draggable={false}
                  width={image.width}
                  height={image.height}
                />
                <AnnotationRenderer annotations={displayAnnotations} />
                {tempAnnotation && (
                  <AnnotationRenderer
                    annotations={[tempAnnotation]}
                    isTemporary
                  />
                )}
              </div>

              <Crosshair />
              <PositionCoordinates />
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
})
