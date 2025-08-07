import { useCallback, useEffect, useMemo, useRef } from "react"
import type { Point, Annotation } from "@vailabel/core"
import {
  getCanvasCoords as utilsGetCanvasCoords,
  isPointInLabel as utilsIsPointInLabel,
  findLabelAtPoint as utilsFindLabelAtPoint,
  getResizeHandle as utilsGetResizeHandle,
} from "@/tools/canvas-utils"
import {
  type CanvasStore,
  type ToolState,
  useCanvasStore,
} from "../stores/canvas-store"
import {
  type AnnotationsStoreType,
  useAnnotationsStore,
} from "../stores/annotation-store"
import {
  ToolHandler,
  MoveHandler,
  BoxHandler,
  PolygonHandler,
  FreeDrawHandler,
  DeleteHandler,
} from "@/tools/tool-handlers"

export interface ToolHandlerContext {
  canvasStore: CanvasStore
  annotationsStore: AnnotationsStoreType
  zoom: number
  panOffset: Point
  toolState: ToolState
  setToolState: (state: Partial<ToolState>) => void
  setIsPanning: (isPanning: boolean) => void
  setLastPanPoint: (point: Point | null) => void
  getCanvasCoords: (clientX: number, clientY: number) => Point
  isPointInLabel: (point: Point, annotation: Annotation) => boolean
  findLabelAtPoint: (point: Point) => Annotation | null
  getResizeHandle: (
    e: React.MouseEvent,
    annotation: Annotation
  ) => string | null
}

const createToolHandler = (
  tool: string,
  context: ToolHandlerContext
): ToolHandler => {
  switch (tool) {
    case "move":
      return new MoveHandler(context)
    case "box":
      return new BoxHandler(context)
    case "polygon":
      return new PolygonHandler(context)
    case "freeDraw":
      return new FreeDrawHandler(context)
    case "delete":
      return new DeleteHandler(context)
    default:
      throw new Error(`Unknown tool: ${tool}`)
  }
}

export function useCanvasHandlers() {
  const canvasStore = useCanvasStore()
  const annotationsStore = useAnnotationsStore()
  const {
    zoom,
    panOffset,
    selectedTool,
    setCursorPosition,
    isPanning,
    setIsPanning,
    lastPanPoint,
    setLastPanPoint,
    toolState,
    setToolState,
    selectedAnnotation,
  } = canvasStore
  const { annotations } = annotationsStore

  // Use refs to avoid recreating handler context too frequently
  const lastMousePositionRef = useRef<Point | null>(null)
  const lastCursorUpdateRef = useRef<number>(0)

  // More aggressive throttling for cursor position updates
  const updateCursorPosition = useCallback(
    (point: Point) => {
      const now = performance.now()
      // Throttle to max 30fps for cursor updates (33ms interval)
      if (now - lastCursorUpdateRef.current < 33) {
        return
      }

      lastCursorUpdateRef.current = now
      setCursorPosition(point)
    },
    [setCursorPosition]
  )

  const handlerContext: ToolHandlerContext = useMemo(
    () => ({
      canvasStore,
      annotationsStore,
      zoom,
      panOffset,
      toolState,
      setToolState,
      setIsPanning,
      setLastPanPoint,
      getCanvasCoords: (clientX: number, clientY: number) =>
        utilsGetCanvasCoords(
          canvasStore.canvasRef.current,
          canvasStore.panOffset, // Use current panOffset from store, not captured value
          canvasStore.zoom, // Use current zoom from store, not captured value
          clientX,
          clientY
        ),
      isPointInLabel: (point: Point, annotation: Annotation) =>
        utilsIsPointInLabel(point, annotation),
      findLabelAtPoint: (point: Point) =>
        utilsFindLabelAtPoint(
          point,
          annotations,
          selectedAnnotation,
          utilsIsPointInLabel
        ),
      getResizeHandle: (e: React.MouseEvent, annotation: Annotation) =>
        utilsGetResizeHandle(
          e,
          annotation,
          canvasStore.canvasRef.current,
          canvasStore.panOffset, // Use current panOffset from store, not captured value
          canvasStore.zoom // Use current zoom from store, not captured value
        ),
    }),
    [
      canvasStore,
      annotationsStore,
      annotations,
      selectedAnnotation,
      setToolState,
      setIsPanning,
      setLastPanPoint,
      zoom,
      panOffset,
      toolState,
    ]
  )

  const toolHandler = createToolHandler(selectedTool, handlerContext)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // If space is held, start panning by setting the pan point
      if (isPanning) {
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }
      // Otherwise, let the tool handle the mouse down
      toolHandler.onMouseDown(e)
    },
    [toolHandler, isPanning, setLastPanPoint]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = handlerContext.getCanvasCoords(e.clientX, e.clientY)

      // Skip processing if mouse hasn't moved significantly (optimization for high-frequency events)
      if (lastMousePositionRef.current) {
        const dx = Math.abs(point.x - lastMousePositionRef.current.x)
        const dy = Math.abs(point.y - lastMousePositionRef.current.y)
        // Increase threshold to reduce processing load even more
        if (dx < 3 && dy < 3) {
          return
        }
      }
      lastMousePositionRef.current = point

      // Only update cursor position if no active operation is happening
      // This reduces unnecessary animation frame calls during dragging/moving
      const hasActiveOperation =
        toolState.isDragging ||
        toolState.isResizing ||
        toolState.isMoving ||
        toolState.isDrawing ||
        isPanning

      if (!hasActiveOperation) {
        updateCursorPosition(point)
      }

      // Handle panning efficiently
      if (isPanning && lastPanPoint) {
        const dx = e.clientX - lastPanPoint.x
        const dy = e.clientY - lastPanPoint.y
        canvasStore.setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy,
        })
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      // Only process tool-specific mouse move if there's actual interaction
      // This is more restrictive to improve performance
      if (hasActiveOperation) {
        toolHandler.onMouseMove(e, point)
      }
    },
    [
      handlerContext,
      isPanning,
      lastPanPoint,
      panOffset,
      setLastPanPoint,
      canvasStore,
      toolHandler,
      toolState.isDragging,
      toolState.isResizing,
      toolState.isMoving,
      toolState.isDrawing,
      updateCursorPosition,
    ]
  )

  const handleMouseUp = useCallback(() => {
    // Clear pan point on mouse up, but don't change isPanning state
    // (isPanning should only be controlled by space key)
    if (isPanning && lastPanPoint) {
      setLastPanPoint(null)
      return
    }
    // If not panning or no pan point set, let tool handle mouse up
    if (!isPanning) {
      toolHandler.onMouseUp()
    }
  }, [toolHandler, isPanning, lastPanPoint, setLastPanPoint])

  const handleDoubleClick = useCallback(() => {
    toolHandler.onDoubleClick?.()
  }, [toolHandler])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPanning) {
        e.preventDefault() // Prevent default space behavior (scrolling)
        setIsPanning(true)
      }

      if (e.key === "Delete" && selectedAnnotation) {
        annotationsStore.deleteAnnotation(selectedAnnotation.id)
        canvasStore.setSelectedAnnotation(null)
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            if (annotationsStore.undo) annotationsStore.undo()
            break
          case "y":
            if (annotationsStore.redo) annotationsStore.redo()
            break
        }
      } else {
        // When switching tools, clear tempAnnotation and toolState
        const clearTemp = () => setToolState({})
        switch (e.key) {
          case "1":
            canvasStore.setSelectedTool("move")
            clearTemp()
            break
          case "2":
            canvasStore.setSelectedTool("box")
            clearTemp()
            break
          case "3":
            canvasStore.setSelectedTool("polygon")
            clearTemp()
            break
          case "4":
            canvasStore.setSelectedTool("freeDraw")
            clearTemp()
            break
          case "5":
            canvasStore.setSelectedTool("delete")
            clearTemp()
            break
        }

        // Let the current tool handle key events
        if (toolHandler.onKeyDown) {
          toolHandler.onKeyDown(e)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault() // Prevent default space behavior
        setIsPanning(false)
        setLastPanPoint(null)
      }
    }

    // Add non-passive wheel event listener for better zoom control
    const handleNativeWheel = (e: WheelEvent) => {
      // Enable zooming with Ctrl/Cmd + scroll OR Alt + scroll
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

        if (canvasStore.canvasRef.current) {
          const rect = canvasStore.canvasRef.current.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top

          const beforeZoomX = (mouseX - panOffset.x) / zoom
          const beforeZoomY = (mouseY - panOffset.y) / zoom

          const afterZoomX = (mouseX - panOffset.x) / newZoom
          const afterZoomY = (mouseY - panOffset.y) / newZoom

          canvasStore.setPanOffset({
            x: panOffset.x + (beforeZoomX - afterZoomX) * newZoom,
            y: panOffset.y + (beforeZoomY - afterZoomY) * newZoom,
          })
        }
        canvasStore.setZoom(newZoom)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Add wheel event listener with explicit non-passive option
    if (canvasStore.canvasRef.current) {
      canvasStore.canvasRef.current.addEventListener(
        "wheel",
        handleNativeWheel,
        { passive: false }
      )
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)

      // Clean up wheel event listener
      if (canvasStore.canvasRef.current) {
        canvasStore.canvasRef.current.removeEventListener(
          "wheel",
          handleNativeWheel
        )
      }
    }
  }, [
    isPanning,
    selectedAnnotation,
    canvasStore,
    annotationsStore,
    setIsPanning,
    setLastPanPoint,
    setToolState,
    toolHandler,
    zoom,
    panOffset,
  ])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    isPanning,
    ...toolHandler.getUIState(),
  }
}
