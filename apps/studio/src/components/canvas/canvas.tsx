import { memo, useCallback, useRef, useMemo, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers-context"
import { type Annotation, type ImageData, type Label } from "@vailabel/core"
import { Crosshair } from "@/components/canvas/crosshair-context"
import { CreateAnnotation } from "@/components/canvas/create-annotation"
import { useLabels } from "@/hooks/useFastAPIQuery"
import {
  useCanvasPan,
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import { TempAnnotation } from "./temp-annotation"
import { ToolStatus } from "./tool-status"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
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
  ({ image, annotations, onRefreshAnnotations }: CanvasProps) => {
    // Use Context hooks instead of Zustand
    const { zoom } = useCanvasZoom()
    const { panOffset } = useCanvasPan()
    const { selectedTool, setToolState } = useCanvasTool()
    const { setSelectedAnnotation } = useCanvasSelection()

    const { data: labels = [] } = useLabels(image.projectId || "")

    const canvasRef = useRef<HTMLDivElement | null>(null)

    // Get all handler props
    const handlerState = useCanvasHandlers(
      canvasRef,
      annotations,
      {
        updateAnnotation: async (id: string, updates: Partial<Annotation>) => {
          try {
            await services.getAnnotationService().updateAnnotation(id, updates)
            // Refresh annotations after update
            if (onRefreshAnnotations) {
              await onRefreshAnnotations()
            }
          } catch (error) {
            console.error("Failed to update annotation:", error)
          }
        },
        deleteAnnotation: async (id: string) => {
          try {
            await services.getAnnotationService().deleteAnnotation(id)
            // Refresh annotations after delete
            if (onRefreshAnnotations) {
              await onRefreshAnnotations()
            }
          } catch (error) {
            console.error("Failed to delete annotation:", error)
          }
        },
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
        if (!image.projectId) return

        try {
          // Get or create label
          const existingLabels = await services
            .getLabelService()
            .getLabelsByProjectId(image.projectId)
          let label = existingLabels.find((l) => l.name === name)

          if (!label) {
            // Create new label
            const newLabel = {
              id: crypto.randomUUID(),
              name: name,
              color: color,
              projectId: image.projectId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            await services.getLabelService().createLabel(newLabel)
            label = newLabel
          }

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
          await services.getAnnotationService().createAnnotation(newAnnotation)

          // Refresh annotations after creation
          if (onRefreshAnnotations) {
            await onRefreshAnnotations()
          }

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
          setSelectedAnnotation(newAnnotation)
        } catch (error) {
          console.error("Failed to create annotation:", error)
        }
      },
      [
        tempAnnotation,
        image.projectId,
        image.id,
        services,
        setToolState,
        setSelectedAnnotation,
        onRefreshAnnotations,
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
                  <AnnotationRenderer annotations={displayAnnotations} />
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
