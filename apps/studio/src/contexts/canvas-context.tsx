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
  selectedTool: string
  toolState: ToolState
  selectedAnnotation: any
  isPanning: boolean
  lastPanPoint: Point | null
  contextMenu: { visible: boolean; x: number; y: number; items: any[] }
  container: { width: number; height: number }
  showCrosshair: boolean
  showCoordinates: boolean
  showRuler: boolean
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  setPanOffset: (pan: Point) => void
  panTo: (x: number, y: number) => void
  resetView: () => void
  /** Incremented to ask the Canvas (which knows the image size) to fit-to-screen. */
  fitSignal: number
  requestFit: () => void
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
  setShowRuler: (showRuler: boolean) => void
  toggleCrosshair: () => void
  toggleCoordinates: () => void
  toggleRuler: () => void
  resetCanvas: () => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

// ── Cursor position (high-frequency) ─────────────────────────────────────────
// The cursor moves on virtually every mousemove event. Keeping it inside the
// main canvas context would re-render every consumer (all annotations, the
// toolbar, panels…) on each move. We isolate it in its own provider and split
// the value from the setter: components that only WRITE the cursor (the event
// handlers) read the setter — whose identity is stable — so they never
// re-render, while only the crosshair/coordinate overlays subscribe to the value.
const CursorValueContext = createContext<Point | null>(null)
const CursorSetContext = createContext<(cursor: Point | null) => void>(() => {})

const CursorProvider = ({ children }: { children: ReactNode }) => {
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  return (
    <CursorSetContext.Provider value={setCursorPosition}>
      <CursorValueContext.Provider value={cursorPosition}>
        {children}
      </CursorValueContext.Provider>
    </CursorSetContext.Provider>
  )
}

export const CanvasProvider = ({ children }: { children: ReactNode }) => {
  const [zoom, setInternalZoom] = useState(1)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
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
  const [showRuler, setShowRuler] = useState(false)
  // Bumped to ask the Canvas to fit the image to the available area.
  const [fitSignal, setFitSignal] = useState(0)

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

  const requestFit = useCallback(() => {
    setFitSignal((current) => current + 1)
  }, [])

  // "Reset view" now fits the image to the canvas (the desktop default) instead
  // of snapping to 100%. The actual fit zoom is computed in the Canvas, which
  // knows the image dimensions; here we just reset pan and signal a fit.
  const resetView = useCallback(() => {
    requestFit()
    setPanOffset({ x: 0, y: 0 })
    setIsPanning(false)
    setLastPanPoint(null)
  }, [requestFit])

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

  const toggleRuler = useCallback(() => {
    setShowRuler((current) => !current)
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
      fitSignal,
      requestFit,
      setSelectedTool,
      setToolState,
      setSelectedAnnotation,
      setIsPanning,
      setLastPanPoint,
      setContextMenu,
      setContainer,
      setShowCrosshair,
      setShowCoordinates,
      setShowRuler,
      showRuler,
      toggleCrosshair,
      toggleCoordinates,
      toggleRuler,
      resetCanvas,
    }),
    [
      zoom,
      panOffset,
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
      fitSignal,
      requestFit,
      setContainer,
      toggleCrosshair,
      toggleCoordinates,
      toggleRuler,
      showRuler,
      resetCanvas,
    ]
  )

  return (
    <CanvasContext.Provider value={value}>
      <CursorProvider>{children}</CursorProvider>
    </CanvasContext.Provider>
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

export const useCanvasFit = () => {
  const { fitSignal, requestFit } = useCanvas()
  return { fitSignal, requestFit }
}

// Readers of the cursor position (crosshair, coordinate overlay). These DO
// re-render as the cursor moves — that is their job.
export const useCanvasCursor = () => {
  const cursorPosition = useContext(CursorValueContext)
  const setCursorPosition = useContext(CursorSetContext)
  return { cursorPosition, setCursorPosition }
}

// Writer-only access for event handlers. The setter identity is stable, so
// subscribing here never triggers a re-render when the cursor moves.
export const useSetCanvasCursor = () => useContext(CursorSetContext)

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
    showRuler,
    setShowCrosshair,
    setShowCoordinates,
    setShowRuler,
    toggleCrosshair,
    toggleCoordinates,
    toggleRuler,
  } = useCanvas()

  return {
    showCrosshair,
    showCoordinates,
    showRuler,
    setShowCrosshair,
    setShowCoordinates,
    setShowRuler,
    toggleCrosshair,
    toggleCoordinates,
    toggleRuler,
  }
}
