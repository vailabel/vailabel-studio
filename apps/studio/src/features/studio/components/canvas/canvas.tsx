import { memo, useCallback, useRef, useMemo, useEffect } from "react"
import { cn } from "@/shared/lib/utils"
import { AnnotationRenderer } from "@/features/studio/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/features/studio/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/features/studio/canvas-state/use-canvas-handlers-context"
import { type Annotation, type ImageData, type Label } from "@/shared/types/core"
import { Crosshair } from "@/features/studio/components/canvas/crosshair-context"
import { CreateAnnotation } from "@/features/studio/components/canvas/create-annotation"
import { ToolStatus } from "@/features/studio/components/canvas/tool-status"
import { Ruler } from "@/features/studio/components/canvas/ruler"
import {
  useCanvasPan,
  useCanvasZoom,
  useCanvasTool,
  useCanvasToolState,
  useCanvasSelection,
  useCanvasContainer,
  useCanvasDisplay,
  useCanvasFit,
} from "@/features/studio/canvas-state/canvas-context"
import { TempAnnotation } from "./temp-annotation"
import { Prediction } from "@/shared/types/core"
import type { PipelinePrompt } from "@/shared/ipc/studio"
import { getCenterOffset } from "@/features/studio/canvas-state/tools/canvas-utils"
import { toAssetUrl } from "@/shared/lib/desktop"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
  predictions?: Prediction[]
  labels: Label[]
  /** Active class: when set, a finished shape is created pre-labeled (no modal). */
  activeLabel?: Label | null
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
  onUndo?: () => Promise<void> | void
  onRedo?: () => Promise<void> | void
  /** Smart-segment (SAM) runner for the smartSegment tool. */
  onSmartSegment?: (prompt: PipelinePrompt) => void | Promise<void>
}

// Memoize the image component to prevent unnecessary re-renders
const CanvasImage = memo(({ image }: { image: ImageData }) => (
  <img
    src={toAssetUrl(image.path)}
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
      <p className="text-lg font-medium text-muted-foreground">
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
    activeLabel,
    onCreateAnnotationDraft,
    onUpdateAnnotation,
    onDeleteAnnotation,
    onUndo,
    onRedo,
    onSmartSegment,
  }: CanvasProps) => {
    // Use Context hooks instead of Zustand
    const { zoom, setZoom } = useCanvasZoom()
    const { panOffset, setPanOffset } = useCanvasPan()
    const { selectedTool } = useCanvasTool()
    const { setToolState } = useCanvasToolState()
    const { setSelectedAnnotation } = useCanvasSelection()
    const { container, setContainer } = useCanvasContainer()
    const { showCrosshair, showCoordinates, showRuler } = useCanvasDisplay()
    const { fitSignal } = useCanvasFit()

    const canvasRef = useRef<HTMLDivElement | null>(null)
    const resizeFrameRef = useRef<number | null>(null)
    const lastMeasuredSizeRef = useRef({ width: 0, height: 0 })
    const fitStateRef = useRef<{ imageId: string; appliedZoom: number } | null>(
      null
    )
    const lastFitSignalRef = useRef(fitSignal)

    useEffect(() => {
      const node = canvasRef.current
      if (!node) return

      const updateSize = () => {
        const rect = node.getBoundingClientRect()
        const nextSize = {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }

        if (
          nextSize.width === lastMeasuredSizeRef.current.width &&
          nextSize.height === lastMeasuredSizeRef.current.height
        ) {
          return
        }

        lastMeasuredSizeRef.current = nextSize
        setContainer(nextSize)
      }

      const scheduleUpdateSize = () => {
        if (resizeFrameRef.current !== null) {
          cancelAnimationFrame(resizeFrameRef.current)
        }

        resizeFrameRef.current = requestAnimationFrame(() => {
          resizeFrameRef.current = null
          updateSize()
        })
      }

      scheduleUpdateSize()

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              scheduleUpdateSize()
            })

      observer?.observe(node)
      window.addEventListener("resize", scheduleUpdateSize)

      return () => {
        observer?.disconnect()
        window.removeEventListener("resize", scheduleUpdateSize)
        if (resizeFrameRef.current !== null) {
          cancelAnimationFrame(resizeFrameRef.current)
        }
      }
    }, [setContainer])

    // Fit-to-canvas: render the image scaled to fit the available area (centered,
    // with a small margin) instead of at 100%, so it's never too big or too small.
    // Re-fits on a new image, on container resize while still fitted, and on an
    // explicit "reset view" — but leaves the view alone once the user has zoomed.
    useEffect(() => {
      if (!image || !container.width || !container.height) return
      if (!image.width || !image.height) return

      const fitZoom = Math.min(
        Math.max(
          Math.min(
            container.width / image.width,
            container.height / image.height
          ) * 0.96,
          0.1
        ),
        5
      )

      const isNewImage = fitStateRef.current?.imageId !== image.id
      const stillFitted =
        !!fitStateRef.current &&
        Math.abs(zoom - fitStateRef.current.appliedZoom) < 0.001
      const forced = fitSignal !== lastFitSignalRef.current
      lastFitSignalRef.current = fitSignal

      if (!(isNewImage || stillFitted || forced)) return

      fitStateRef.current = { imageId: image.id, appliedZoom: fitZoom }
      if (Math.abs(zoom - fitZoom) > 0.001) {
        setZoom(fitZoom)
        setPanOffset({ x: 0, y: 0 })
      } else if (isNewImage || forced) {
        setPanOffset({ x: 0, y: 0 })
      }
    }, [
      image,
      container.width,
      container.height,
      zoom,
      fitSignal,
      setZoom,
      setPanOffset,
    ])

    const centerOffset = useMemo(
      () =>
        getCenterOffset(
          container,
          { width: image.width, height: image.height },
          zoom
        ),
      [container, image.width, image.height, zoom]
    )

    const baseOffset = useMemo(
      () => ({
        x: centerOffset.x + panOffset.x,
        y: centerOffset.y + panOffset.y,
      }),
      [centerOffset.x, centerOffset.y, panOffset.x, panOffset.y]
    )

    // Get all handler props
    const handlerState = useCanvasHandlers(
      canvasRef,
      annotations,
      {
        updateAnnotation: onUpdateAnnotation,
        deleteAnnotation: onDeleteAnnotation,
        undo: onUndo,
        redo: onRedo,
        runSmartSegment: onSmartSegment,
      },
      { id: image.id, width: image.width, height: image.height },
      {
        baseOffset,
        centerOffset,
        container,
        image: { width: image.width, height: image.height },
      }
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
    // Live drawing state for the in-canvas tool hint.
    const polygonPoints =
      "polygonPoints" in handlerState ? handlerState.polygonPoints : undefined
    const inProgressPointCount = Array.isArray(polygonPoints)
      ? polygonPoints.length
      : 0
    const isDraggingTool =
      "isDragging" in handlerState ? Boolean(handlerState.isDragging) : false
    const isDrawingTool =
      "isDrawing" in handlerState ? Boolean(handlerState.isDrawing) : false

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
      async (name: string, color: string, labelId?: string) => {
        if (!tempAnnotation) return

        try {
          await onCreateAnnotationDraft({
            name: name,
            type: tempAnnotation.type ?? "box",
            coordinates: tempAnnotation.coordinates ?? [],
            color,
            labelId,
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

    // Fast path (Roboflow-style): with an active class selected, a finished
    // shape is created immediately with that class — the naming modal is skipped
    // entirely. The modal only appears when no class is active. A ref guards
    // against the async create re-firing before tool state clears.
    const autoCreateRef = useRef(false)
    useEffect(() => {
      if (showLabelInput && tempAnnotation && activeLabel && !autoCreateRef.current) {
        autoCreateRef.current = true
        void handleCreateAnnotation(
          activeLabel.name,
          activeLabel.color,
          activeLabel.id
        ).finally(() => {
          autoCreateRef.current = false
        })
      }
    }, [showLabelInput, tempAnnotation, activeLabel, handleCreateAnnotation])

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
        smartSegment: "cursor-crosshair",
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
        transform: `translate(${baseOffset.x}px, ${baseOffset.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        willChange: "transform", // Hint to browser for GPU acceleration
      }),
      [baseOffset.x, baseOffset.y, zoom]
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
        <div className="relative h-full w-full overflow-hidden bg-muted">
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

                {showCrosshair && (
                  <Crosshair canvasRef={canvasRef} baseOffset={baseOffset} />
                )}
                {showCoordinates && (
                  <PositionCoordinates baseOffset={baseOffset} />
                )}
                {showRuler && <Ruler baseOffset={baseOffset} />}

                <ToolStatus
                  tool={selectedTool}
                  isVisible={selectedTool !== "move"}
                  pointCount={inProgressPointCount}
                  isDragging={isDraggingTool}
                  isDrawing={isDrawingTool}
                />
              </div>
            )}
          </div>
        </div>
        <CreateAnnotation
          labels={labels}
          onSubmit={handleCreateAnnotation}
          isOpen={!!showLabelInput && !activeLabel}
          onClose={handleCloseCreateAnnotationModal}
        />
      </>
    )
  }
)

