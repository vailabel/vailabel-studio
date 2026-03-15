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
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  setPanOffset: (pan: Point) => void
  panTo: (x: number, y: number) => void
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
  resetCanvas: () => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

export const CanvasProvider = ({ children }: { children: ReactNode }) => {
  const [zoom, setZoom] = useState(1)
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
  const [container, setContainer] = useState({ width: 0, height: 0 })

  const setToolState = useCallback((state: Partial<ToolState>) => {
    setInternalToolState((current) => ({ ...current, ...state }))
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((current) => Math.min(current * 1.2, 5))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((current) => Math.max(current / 1.2, 0.1))
  }, [])

  const panTo = useCallback((x: number, y: number) => {
    setPanOffset({ x, y })
  }, [])

  const resetCanvas = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    setCursorPosition(null)
    setSelectedTool("move")
    setInternalToolState({})
    setSelectedAnnotation(null)
    setIsPanning(false)
    setLastPanPoint(null)
    setContextMenu({ visible: false, x: 0, y: 0, items: [] })
  }, [])

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
      setZoom,
      zoomIn,
      zoomOut,
      setPanOffset,
      panTo,
      setCursorPosition,
      setSelectedTool,
      setToolState,
      setSelectedAnnotation,
      setIsPanning,
      setLastPanPoint,
      setContextMenu,
      setContainer,
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
      zoomIn,
      zoomOut,
      panTo,
      setToolState,
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

export const useCanvasState = () => useCanvas()

export const useCanvasTool = () => {
  const { selectedTool, setSelectedTool, toolState, setToolState } = useCanvas()
  return { selectedTool, setSelectedTool, toolState, setToolState }
}

export const useCanvasZoom = () => {
  const { zoom, setZoom, zoomIn, zoomOut } = useCanvas()
  return { zoom, setZoom, zoomIn, zoomOut }
}

export const useCanvasPan = () => {
  const { panOffset, setPanOffset, panTo } = useCanvas()
  return { panOffset, setPanOffset, panTo }
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
