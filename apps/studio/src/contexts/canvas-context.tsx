import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Point = { x: number; y: number }

type ToolState = {
  isDragging?: boolean
  isResizing?: boolean
  isMoving?: boolean
  isDrawing?: boolean
  startPoint?: Point | null
  tempAnnotation?: any
  showLabelInput?: boolean
  polygonPoints?: Point[]
  freeDrawPoints?: Point[]
  movingAnnotationId?: string | null
  resizingAnnotationId?: string | null
  previewCoordinates?: Point[] | null
  resizeHandle?: string | null
}

interface CanvasContextType {
  zoom: number
  panOffset: Point
  cursorPosition: Point | null
  selectedTool: string
  toolState: ToolState
  selectedAnnotation: any
  isPanning: boolean
  lastPanPoint: Point | null
  contextMenu: { visible: boolean; x: number; y: number; items: any[] }
  container: { width: number; height: number }
  showCrosshair: boolean
  showCoordinates: boolean
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  setPanOffset: (pan: Point) => void
  panTo: (x: number, y: number) => void
  resetView: () => void
  setCursorPosition: (cursor: Point | null) => void
  setSelectedTool: (tool: string) => void
  setToolState: (state: Partial<ToolState>) => void
  setSelectedAnnotation: (annotation: any) => void
  setIsPanning: (isPanning: boolean) => void
  setLastPanPoint: (point: Point | null) => void
  setContextMenu: (menu: {
    visible: boolean
    x: number
    y: number
    items: any[]
  }) => void
  setContainer: (container: { width: number; height: number }) => void
  setShowCrosshair: (showCrosshair: boolean) => void
  setShowCoordinates: (showCoordinates: boolean) => void
  toggleCrosshair: () => void
  toggleCoordinates: () => void
  resetCanvas: () => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

export const CanvasProvider = ({ children }: { children: ReactNode }) => {
  const [zoom, setInternalZoom] = useState(1)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  const [selectedTool, setSelectedTool] = useState("move")
  const [toolState, setInternalToolState] = useState<ToolState>({})
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  })
  const [container, setContainerState] = useState({ width: 0, height: 0 })
  const [showCrosshair, setShowCrosshair] = useState(true)
  const [showCoordinates, setShowCoordinates] = useState(true)

  const setZoom = useCallback((nextZoom: number) => {
    const normalizedZoom = Number.isFinite(nextZoom) ? nextZoom : 1
    setInternalZoom(Math.min(Math.max(normalizedZoom, 0.1), 5))
  }, [])

  const setToolState = useCallback((state: Partial<ToolState>) => {
    setInternalToolState((current) => ({ ...current, ...state }))
  }, [])

  const zoomIn = useCallback(() => {
    setInternalZoom((current) => Math.min(current * 1.2, 5))
  }, [])

  const zoomOut = useCallback(() => {
    setInternalZoom((current) => Math.max(current / 1.2, 0.1))
  }, [])

  const panTo = useCallback((x: number, y: number) => {
    setPanOffset({ x, y })
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    setCursorPosition(null)
    setIsPanning(false)
    setLastPanPoint(null)
  }, [setZoom])

  const setContainer = useCallback(
    (nextContainer: { width: number; height: number }) => {
      setContainerState((current) => {
        if (
          current.width === nextContainer.width &&
          current.height === nextContainer.height
        ) {
          return current
        }
        return nextContainer
      })
    },
    []
  )

  const toggleCrosshair = useCallback(() => {
    setShowCrosshair((current) => !current)
  }, [])

  const toggleCoordinates = useCallback(() => {
    setShowCoordinates((current) => !current)
  }, [])

  const resetCanvas = useCallback(() => {
    resetView()
    setSelectedTool("move")
    setInternalToolState({})
    setSelectedAnnotation(null)
    setContextMenu({ visible: false, x: 0, y: 0, items: [] })
  }, [resetView])

  const value = useMemo<CanvasContextType>(
    () => ({
      zoom,
      panOffset,
      cursorPosition,
      selectedTool,
      toolState,
      selectedAnnotation,
      isPanning,
      lastPanPoint,
      contextMenu,
      container,
      showCrosshair,
      showCoordinates,
      setZoom,
      zoomIn,
      zoomOut,
      setPanOffset,
      panTo,
      resetView,
      setCursorPosition,
      setSelectedTool,
      setToolState,
      setSelectedAnnotation,
      setIsPanning,
      setLastPanPoint,
      setContextMenu,
      setContainer,
      setShowCrosshair,
      setShowCoordinates,
      toggleCrosshair,
      toggleCoordinates,
      resetCanvas,
    }),
    [
      zoom,
      panOffset,
      cursorPosition,
      selectedTool,
      toolState,
      selectedAnnotation,
      isPanning,
      lastPanPoint,
      contextMenu,
      container,
      showCrosshair,
      showCoordinates,
      setZoom,
      zoomIn,
      zoomOut,
      panTo,
      setToolState,
      resetView,
      setContainer,
      toggleCrosshair,
      toggleCoordinates,
      resetCanvas,
    ]
  )

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  )
}

const useCanvas = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider")
  }
  return context
}

export const useCanvasState = <TSelected = CanvasContextType>(
  selector?: (state: CanvasContextType) => TSelected
): TSelected => {
  const state = useCanvas()
  return selector ? selector(state) : (state as TSelected)
}

export const useCanvasTool = () => {
  const { selectedTool, setSelectedTool, toolState, setToolState } = useCanvas()
  return { selectedTool, setSelectedTool, toolState, setToolState }
}

export const useCanvasZoom = () => {
  const { zoom, setZoom, zoomIn, zoomOut } = useCanvas()
  return { zoom, setZoom, zoomIn, zoomOut }
}

export const useCanvasPan = () => {
  const { panOffset, setPanOffset, panTo, resetView } = useCanvas()
  return { panOffset, setPanOffset, panTo, resetView }
}

export const useCanvasCursor = () => {
  const { cursorPosition, setCursorPosition } = useCanvas()
  return { cursorPosition, setCursorPosition }
}

export const useCanvasSelection = () => {
  const { selectedAnnotation, setSelectedAnnotation } = useCanvas()
  return { selectedAnnotation, setSelectedAnnotation }
}

export const useCanvasContextMenu = () => {
  const { contextMenu, setContextMenu } = useCanvas()
  return { contextMenu, setContextMenu }
}

export const useCanvasContainer = () => {
  const { container, setContainer } = useCanvas()
  return { container, setContainer }
}

export const useCanvasPanning = () => {
  const {
    panOffset,
    setPanOffset,
    panTo,
    isPanning,
    setIsPanning,
    lastPanPoint,
    setLastPanPoint,
  } = useCanvas()
  return {
    panOffset,
    setPanOffset,
    panTo,
    isPanning,
    setIsPanning,
    lastPanPoint,
    setLastPanPoint,
  }
}

export const useCanvasDisplay = () => {
  const {
    showCrosshair,
    showCoordinates,
    setShowCrosshair,
    setShowCoordinates,
    toggleCrosshair,
    toggleCoordinates,
  } = useCanvas()

  return {
    showCrosshair,
    showCoordinates,
    setShowCrosshair,
    setShowCoordinates,
    toggleCrosshair,
    toggleCoordinates,
  }
}
