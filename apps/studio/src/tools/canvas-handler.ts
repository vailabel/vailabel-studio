import { useCallback, useEffect, useMemo } from "react"
import type { Point, Annotation } from "@vailabel/core"
import {
  getCanvasCoords as utilsGetCanvasCoords,
  isPointInLabel as utilsIsPointInLabel,
  findLabelAtPoint as utilsFindLabelAtPoint,
  getResizeHandle as utilsGetResizeHandle,
} from "@/tools/canvas-utils"
import { type CanvasStore, useCanvasStore } from "../stores/canvas-store"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolState: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setToolState: (state: Record<string, any>) => void
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
      zoom,
      panOffset,
      toolState,
      setToolState,
      setIsPanning,
      setLastPanPoint,
      annotations,
      selectedAnnotation,
    ]
  )

  const toolHandler = createToolHandler(selectedTool, handlerContext)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) return
      toolHandler.onMouseDown(e)
    },
    [toolHandler, isPanning]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = handlerContext.getCanvasCoords(e.clientX, e.clientY)
      setCursorPosition(point)

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

      toolHandler.onMouseMove(e, point)
    },
    [
      toolHandler,
      isPanning,
      lastPanPoint,
      panOffset,
      setCursorPosition,
      setLastPanPoint,
      canvasStore,
      handlerContext,
    ]
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      setLastPanPoint(null)
      return
    }
    toolHandler.onMouseUp()
  }, [toolHandler, isPanning, setIsPanning, setLastPanPoint])

  const handleDoubleClick = useCallback(() => {
    toolHandler.onDoubleClick?.()
  }, [toolHandler])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
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
      // else: allow default scroll behavior
    },
    [zoom, panOffset, canvasStore]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPanning) {
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
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsPanning(false)
        setLastPanPoint(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [
    isPanning,
    selectedAnnotation,
    canvasStore,
    annotationsStore,
    setIsPanning,
    setLastPanPoint,
    setToolState,
  ])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
    isPanning,
    ...toolHandler.getUIState(),
  }
}
