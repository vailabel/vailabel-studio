import { useCallback, useEffect, useMemo, useRef } from "react"
import type { Point, Annotation } from "@/shared/types/core"
import type { PipelinePrompt } from "@/shared/ipc/studio"
import {
  getCanvasCoords as utilsGetCanvasCoords,
  isPointInLabel as utilsIsPointInLabel,
  findLabelAtPoint as utilsFindLabelAtPoint,
  getResizeHandle as utilsGetResizeHandle,
  getCenterOffset,
} from "@/features/studio/canvas-state/tools/canvas-utils"
import {
  useSetCanvasCursor,
  useCanvasPan,
  useCanvasZoom,
  useCanvasTool,
  useCanvasToolState,
  useCanvasPanning,
  useCanvasSelection
} from "@/features/studio/canvas-state/canvas-context"
import type { ToolHandlerContext } from "@/features/studio/canvas-state/tools/tool-handlers"
import { createToolHandler, TOOL_HOTKEYS } from "@/features/studio/canvas-state/tools/tool-registry"

// `ToolHandlerContext` is defined in the tools layer (the handlers depend on the
// abstraction, not on this hook). Re-exported here for existing import sites.
export type { ToolHandlerContext } from "@/features/studio/canvas-state/tools/tool-handlers"

// Arrow key → unit nudge direction in image space (down is +y), for the
// keyboard-nudge of the selected shape.
const ARROW_NUDGES: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export function useCanvasHandlers(
  canvasRef?: React.RefObject<HTMLDivElement | null>,
  annotations: Annotation[] = [],
  storeMethods?: {
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<unknown>
    deleteAnnotation: (id: string) => Promise<void>
    undo?: () => Promise<void> | void
    redo?: () => Promise<void> | void
    runSmartSegment?: (prompt: PipelinePrompt) => void | Promise<void>
  },
  currentImage?: { id: string; width?: number; height?: number },
  layout?: {
    baseOffset: Point
    centerOffset: Point
    container: { width: number; height: number }
    image: { width: number; height: number }
  }
) {
  const defaultCanvasRef = useRef<HTMLDivElement | null>(null)
  const actualCanvasRef = canvasRef || defaultCanvasRef
  const runSmartSegment = storeMethods?.runSmartSegment
  const annotationsStore = useMemo(() => ({
    annotations,
    updateAnnotation: storeMethods?.updateAnnotation || (async () => {}),
    deleteAnnotation: storeMethods?.deleteAnnotation || (async () => {}),
    undo: storeMethods?.undo || (() => {}),
    redo: storeMethods?.redo || (() => {}),
    currentImage
  }), [annotations, storeMethods, currentImage])
  
  // Use selective hooks for better performance
  const setCursorPosition = useSetCanvasCursor()
  const { panOffset, setPanOffset } = useCanvasPan()
  const { zoom, setZoom } = useCanvasZoom()
  const { selectedTool, setSelectedTool } = useCanvasTool()
  const { toolState, setToolState } = useCanvasToolState()
  const { isPanning, setIsPanning, lastPanPoint, setLastPanPoint } = useCanvasPanning()
  const { selectedAnnotation, setSelectedAnnotation } = useCanvasSelection()
  const baseOffset = layout?.baseOffset || panOffset
  const containerSize =
    layout?.container ||
    {
      width: actualCanvasRef.current?.clientWidth || 0,
      height: actualCanvasRef.current?.clientHeight || 0,
    }
  const imageSize =
    layout?.image || { width: currentImage?.width || 0, height: currentImage?.height || 0 }
  
  // Get zoom from state (remove this line since we now get it from useCanvasZoom)
  // const { zoom } = useCanvasState<{ zoom: number }>(state => ({ zoom: state.zoom }))

  // Use refs to avoid recreating handler context too frequently
  const lastMousePositionRef = useRef<Point | null>(null)
  const lastCursorUpdateRef = useRef<number>(0)

  // More responsive cursor position updates for real-time crosshair
  const updateCursorPosition = useCallback(
    (point: Point) => {
      const now = performance.now()
      
      // Check if we're in an active operation that needs smooth updates
      const hasActiveOperation =
        toolState.isDragging ||
        toolState.isResizing ||
        toolState.isMoving ||
        toolState.isDrawing
      
      // Use different throttling based on operation state - more responsive for crosshair
      const interval = hasActiveOperation ? 8 : 16 // 120fps during operations, 60fps otherwise
      
      if (now - lastCursorUpdateRef.current < interval) {
        return
      }

      lastCursorUpdateRef.current = now
      
      // Direct update without RAF to avoid performance violations
      setCursorPosition(point)
    },
    [setCursorPosition, toolState.isDragging, toolState.isResizing, toolState.isMoving, toolState.isDrawing]
  )

  const handlerContext: ToolHandlerContext = useMemo(
    () => ({
      canvasRef: actualCanvasRef,
      annotationsStore,
      zoom,
      panOffset,
      toolState,
      setToolState,
      setIsPanning,
      setLastPanPoint,
      selectedAnnotation,
      setSelectedAnnotation,
      getCanvasCoords: (clientX: number, clientY: number) =>
        utilsGetCanvasCoords(
          actualCanvasRef.current,
          baseOffset,
          zoom,
          clientX,
          clientY
        ),
      isPointInLabel: (point: Point, annotation: Annotation) =>
        utilsIsPointInLabel(point, annotation),
      findLabelAtPoint: (point: Point) =>
        utilsFindLabelAtPoint(
          point,
          annotationsStore.annotations,
          selectedAnnotation,
          utilsIsPointInLabel
        ),
      getResizeHandle: (point: Point, annotation: Annotation) =>
        utilsGetResizeHandle(point, annotation, zoom),
      runSmartSegment,
    }),
    [
      actualCanvasRef,
      annotationsStore,
      selectedAnnotation,
      setSelectedAnnotation,
      setToolState,
      setIsPanning,
      setLastPanPoint,
      zoom,
      panOffset,
      toolState,
      runSmartSegment,
    ]
  )

  // Build the handler only when the tool or its context actually changes —
  // previously a new handler instance was created on every render, which
  // invalidated every mouse callback and forced the keyboard/wheel effect below
  // to re-subscribe its window listeners constantly.
  const toolHandler = useMemo(
    () => createToolHandler(selectedTool, handlerContext),
    [selectedTool, handlerContext]
  )

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
      // Only process mouse events when mouse is over the canvas
      if (!actualCanvasRef.current) return
      
      const canvasRect = actualCanvasRef.current.getBoundingClientRect()
      const isMouseOverCanvas = e.clientX >= canvasRect.left && 
                               e.clientX <= canvasRect.right &&
                               e.clientY >= canvasRect.top && 
                               e.clientY <= canvasRect.bottom
      
      if (!isMouseOverCanvas) {
        // Clear cursor position when mouse leaves canvas
        setCursorPosition(null)
        return
      }
      
      const point = handlerContext.getCanvasCoords(e.clientX, e.clientY)
      const canvasPoint = utilsGetCanvasCoords(
        actualCanvasRef.current,
        baseOffset,
        zoom,
        e.clientX,
        e.clientY
      )

      // Skip processing if mouse hasn't moved significantly (optimization for high-frequency events)
      if (lastMousePositionRef.current) {
        const dx = Math.abs(point.x - lastMousePositionRef.current.x)
        const dy = Math.abs(point.y - lastMousePositionRef.current.y)
        
        // Use different thresholds based on operation state - more responsive for crosshair
        const hasActiveOperation =
          toolState.isDragging ||
          toolState.isResizing ||
          toolState.isMoving ||
          toolState.isDrawing
          
        const baseThreshold = hasActiveOperation ? 1 : 3 // More responsive for crosshair updates
        const threshold = Math.max(baseThreshold, (hasActiveOperation ? 2 : 5) / zoom)
        
        if (dx < threshold && dy < threshold) {
          return
        }
      }
      lastMousePositionRef.current = point

      // Always update cursor position for smooth crosshair during operations
      updateCursorPosition(canvasPoint)

      // Handle panning efficiently
      if (isPanning && lastPanPoint) {
        const dx = e.clientX - lastPanPoint.x
        const dy = e.clientY - lastPanPoint.y
        setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy,
        })
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      // Only process tool-specific mouse move if there's actual interaction
      const hasActiveOperation =
        toolState.isDragging ||
        toolState.isResizing ||
        toolState.isMoving ||
        toolState.isDrawing

      if (hasActiveOperation) {
        toolHandler.onMouseMove(e, point)
      }
    },
    [
      actualCanvasRef,
      handlerContext,
      isPanning,
      lastPanPoint,
      panOffset,
      setLastPanPoint,
      setPanOffset,
      toolHandler,
      toolState.isDragging,
      toolState.isResizing,
      toolState.isMoving,
      toolState.isDrawing,
      updateCursorPosition,
      zoom,
      setCursorPosition,
      baseOffset.x,
      baseOffset.y,
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

  const handleMouseLeave = useCallback(() => {
    // Clear cursor position when mouse leaves the canvas area
    setCursorPosition(null)
  }, [setCursorPosition])

  const handleDoubleClick = useCallback(() => {
    toolHandler.onDoubleClick?.()
  }, [toolHandler])

  // Latest-value snapshot for the window/wheel listeners below. Keeping these in
  // a ref lets the keyboard + wheel effect subscribe ONCE (on mount) instead of
  // re-subscribing on every render / pan / zoom, while still reading fresh state.
  const liveRef = useRef({
    toolHandler,
    isPanning,
    selectedAnnotation,
    annotationsStore,
    zoom,
    baseOffset,
    containerSize,
    imageSize,
    setIsPanning,
    setLastPanPoint,
    setSelectedTool,
    setToolState,
    setSelectedAnnotation,
    setZoom,
    setPanOffset,
  })
  // Keep the snapshot fresh after every render (synced in an effect rather than
  // during render so it never writes a ref mid-render).
  useEffect(() => {
    liveRef.current = {
      toolHandler,
      isPanning,
      selectedAnnotation,
      annotationsStore,
      zoom,
      baseOffset,
      containerSize,
      imageSize,
      setIsPanning,
      setLastPanPoint,
      setSelectedTool,
      setToolState,
      setSelectedAnnotation,
      setZoom,
      setPanOffset,
    }
  })

  // Keyboard + wheel handling — subscribed once; reads live state via liveRef.
  useEffect(() => {
    // Reset the drawing/move state when switching tools. NOTE: the context's
    // setToolState MERGES, so `setToolState({})` is a no-op — every key that
    // must be cleared has to be set explicitly.
    const clearToolState = () =>
      liveRef.current.setToolState({
        isDragging: false,
        isResizing: false,
        isMoving: false,
        isDrawing: false,
        startPoint: null,
        tempAnnotation: null,
        showLabelInput: false,
        polygonPoints: undefined,
        freeDrawPoints: undefined,
        movingAnnotationId: null,
        resizingAnnotationId: null,
        previewCoordinates: null,
        resizeHandle: null,
      })

    const handleKeyDown = (e: KeyboardEvent) => {
      const L = liveRef.current
      const target = e.target as HTMLElement | null
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)

      if (isTypingTarget) {
        return
      }

      if (e.code === "Space" && !L.isPanning) {
        e.preventDefault()
        L.setIsPanning(true)
        return
      }

      if ((e.key === "Delete" || e.key === "Backspace") && L.selectedAnnotation) {
        e.preventDefault()
        void L.annotationsStore
          .deleteAnnotation(L.selectedAnnotation.id)
          .catch((error) => {
            console.error("Failed to delete annotation:", error)
          })
        L.setSelectedAnnotation(null)
        return
      }

      // Arrow keys nudge the selected shape (1px, Shift = 10px) — the pixel-precise
      // adjustment every annotation/design tool has. Moves all of its coordinates.
      const nudge = ARROW_NUDGES[e.key]
      if (nudge && L.selectedAnnotation) {
        e.preventDefault()
        const selected = L.annotationsStore.annotations.find(
          (a) => a.id === L.selectedAnnotation?.id
        )
        if (selected) {
          const step = e.shiftKey ? 10 : 1
          const coordinates = selected.coordinates.map((p) => ({
            ...p,
            x: p.x + nudge[0] * step,
            y: p.y + nudge[1] * step,
          }))
          void L.annotationsStore.updateAnnotation(selected.id, {
            coordinates,
            updatedAt: new Date(),
          })
        }
        return
      }

      if (e.ctrlKey || e.metaKey) {
        const comboKey = e.key.toLowerCase()
        // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo, Ctrl/Cmd+Y = redo.
        if (comboKey === "z") {
          e.preventDefault()
          if (e.shiftKey) void L.annotationsStore.redo()
          else void L.annotationsStore.undo()
          return
        }
        if (comboKey === "y") {
          e.preventDefault()
          void L.annotationsStore.redo()
          return
        }
        return
      }

      const key = e.key.toLowerCase()
      const tool = TOOL_HOTKEYS[key]
      if (tool) {
        L.setSelectedTool(tool)
        clearToolState()
        return
      }
      if (key === "=" || key === "+") {
        e.preventDefault()
        L.setZoom(Math.min(5, L.zoom * 1.2))
        return
      }
      if (key === "-" || key === "_") {
        e.preventDefault()
        L.setZoom(Math.max(0.1, L.zoom / 1.2))
        return
      }

      // Let the current tool handle remaining key events
      L.toolHandler.onKeyDown?.(e)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        liveRef.current.setIsPanning(false)
        liveRef.current.setLastPanPoint(null)
      }
    }

    // Non-passive wheel listener: zoom around the cursor with Ctrl/Cmd/Alt+scroll.
    const handleNativeWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || e.altKey)) return
      const L = liveRef.current
      e.preventDefault()
      e.stopPropagation()

      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, L.zoom + delta))
      const el = actualCanvasRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const beforeZoomX = (mouseX - L.baseOffset.x) / L.zoom
      const beforeZoomY = (mouseY - L.baseOffset.y) / L.zoom
      const nextCenterOffset = getCenterOffset(L.containerSize, L.imageSize, newZoom)

      L.setPanOffset({
        x: mouseX - nextCenterOffset.x - beforeZoomX * newZoom,
        y: mouseY - nextCenterOffset.y - beforeZoomY * newZoom,
      })
      L.setZoom(newZoom)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    const canvasElement = actualCanvasRef.current
    canvasElement?.addEventListener("wheel", handleNativeWheel, {
      passive: false,
    })

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      canvasElement?.removeEventListener("wheel", handleNativeWheel)
    }
  }, [actualCanvasRef])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleDoubleClick,
    isPanning,
    canvasRef: actualCanvasRef,
    ...toolHandler.getUIState(),
  }
}

