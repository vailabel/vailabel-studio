import { useCallback, useEffect, useMemo, useRef } from "react"
import type { Point, Annotation } from "@vailabel/core"
import {
  getCanvasCoords as utilsGetCanvasCoords,
  getImageCoords as utilsGetImageCoords,
  isPointInLabel as utilsIsPointInLabel,
  findLabelAtPoint as utilsFindLabelAtPoint,
  getResizeHandle as utilsGetResizeHandle,
} from "@/tools/canvas-utils"
import {
  useCanvasCursor,
  useCanvasPan,
  useCanvasZoom,
  useCanvasTool,
  useCanvasPanning,
  useCanvasSelection
} from "@/contexts/canvas-context"
import {
  ToolHandler,
  MoveHandler,
  BoxHandler,
  PolygonHandler,
  FreeDrawHandler,
  DeleteHandler,
} from "@/tools/tool-handlers"

export interface ToolHandlerContext {
  canvasRef: React.RefObject<HTMLDivElement | null>
  canvasStore: {
    canvasRef: React.RefObject<HTMLDivElement | null>
    panOffset: Point
    zoom: number
    toolState: Record<string, unknown>
    setToolState: (state: Partial<Record<string, unknown>>) => void
    setIsPanning: (isPanning: boolean) => void
    setLastPanPoint: (point: Point | null) => void
    selectedAnnotation: Annotation | null
    setSelectedAnnotation: (annotation: Annotation | null) => void
  }
  annotationsStore: { 
    annotations: Annotation[]
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>
    deleteAnnotation: (id: string) => Promise<void>
    currentImage?: { id: string }
  }
  zoom: number
  panOffset: Point
  toolState: Record<string, unknown>
  setToolState: (state: Partial<Record<string, unknown>>) => void
  setIsPanning: (isPanning: boolean) => void
  setLastPanPoint: (point: Point | null) => void
  selectedAnnotation: Annotation | null
  setSelectedAnnotation: (annotation: Annotation | null) => void
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

export function useCanvasHandlers(
  canvasRef?: React.RefObject<HTMLDivElement | null>,
  annotations: Annotation[] = [],
  storeMethods?: {
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>
    deleteAnnotation: (id: string) => Promise<void>
  },
  currentImage?: { id: string }
) {
  const defaultCanvasRef = useRef<HTMLDivElement | null>(null)
  const actualCanvasRef = canvasRef || defaultCanvasRef
  const annotationsStore = useMemo(() => ({ 
    annotations,
    updateAnnotation: storeMethods?.updateAnnotation || (async () => {}),
    deleteAnnotation: storeMethods?.deleteAnnotation || (async () => {}),
    currentImage
  }), [annotations, storeMethods, currentImage])
  
  // Use selective hooks for better performance
  const { setCursorPosition } = useCanvasCursor()
  const { panOffset, setPanOffset } = useCanvasPan()
  const { zoom, setZoom } = useCanvasZoom()
  const { selectedTool, toolState, setToolState } = useCanvasTool()
  const { isPanning, setIsPanning, lastPanPoint, setLastPanPoint } = useCanvasPanning()
  const { selectedAnnotation, setSelectedAnnotation } = useCanvasSelection()
  
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
      canvasStore: {
        canvasRef: actualCanvasRef,
        panOffset,
        zoom,
        toolState,
        setToolState,
        setIsPanning,
        setLastPanPoint,
        selectedAnnotation,
        setSelectedAnnotation,
      },
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
        utilsGetImageCoords(
          actualCanvasRef.current,
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
      getResizeHandle: (e: React.MouseEvent, annotation: Annotation) =>
        utilsGetResizeHandle(
          e,
          annotation,
          actualCanvasRef.current,
          zoom
        ),
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
        panOffset,
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

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPanning) {
        e.preventDefault()
        setIsPanning(true)
      }

      if (e.key === "Delete" && selectedAnnotation) {
        // Handle delete annotation
        setSelectedAnnotation(null)
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            // Handle undo
            break
          case "y":
            // Handle redo
            break
        }
      } else {
        // When switching tools, clear tempAnnotation and toolState
        const clearTemp = () => setToolState({})
        switch (e.key) {
          case "1":
            // setSelectedTool("move")
            clearTemp()
            break
          case "2":
            // setSelectedTool("box")
            clearTemp()
            break
          case "3":
            // setSelectedTool("polygon")
            clearTemp()
            break
          case "4":
            // setSelectedTool("freeDraw")
            clearTemp()
            break
          case "5":
            // setSelectedTool("delete")
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
        e.preventDefault()
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

        if (actualCanvasRef.current) {
          const rect = actualCanvasRef.current.getBoundingClientRect()
          
          // Use mouse position for zoom center
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top

          // Calculate the point in image coordinates before zoom
          const beforeZoomX = (mouseX - panOffset.x) / zoom
          const beforeZoomY = (mouseY - panOffset.y) / zoom

          // Calculate the point in image coordinates after zoom
          const afterZoomX = (mouseX - panOffset.x) / newZoom
          const afterZoomY = (mouseY - panOffset.y) / newZoom

          // Adjust pan offset to keep the mouse point stable
          setPanOffset({
            x: panOffset.x + (beforeZoomX - afterZoomX) * newZoom,
            y: panOffset.y + (beforeZoomY - afterZoomY) * newZoom,
          })
          
          // Apply the new zoom
          setZoom(newZoom)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Add wheel event listener with explicit non-passive option
    const canvasElement = actualCanvasRef.current
    if (canvasElement) {
      canvasElement.addEventListener(
        "wheel",
        handleNativeWheel,
        { passive: false }
      )
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)

      // Clean up wheel event listener
      if (canvasElement) {
        canvasElement.removeEventListener(
          "wheel",
          handleNativeWheel
        )
      }
    }
  }, [
    actualCanvasRef,
    isPanning,
    selectedAnnotation,
    setIsPanning,
    setLastPanPoint,
    setToolState,
    toolHandler,
    zoom,
    panOffset,
    setPanOffset,
    setSelectedAnnotation,
    setZoom,
  ])

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
