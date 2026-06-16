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

// The "stable-ish" canvas state. Pan offset and selection live in their OWN
// providers below — they change on every pan frame / every click, and bundling
// them here re-rendered every annotation (each subscribes via useCanvasZoom /
// useCanvasTool). What's left changes rarely (zoom, tool, container, display
// toggles) or is read by few consumers.
interface CanvasContextType {
  zoom: number
  selectedTool: string
  contextMenu: { visible: boolean; x: number; y: number; items: any[] }
  container: { width: number; height: number }
  showCrosshair: boolean
  showCoordinates: boolean
  showRuler: boolean
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  /** Incremented to ask the Canvas (which knows the image size) to fit-to-screen. */
  fitSignal: number
  requestFit: () => void
  setSelectedTool: (tool: string) => void
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

// ── Pan (high-frequency) ──────────────────────────────────────────────────────
// panOffset + lastPanPoint are rewritten on every mousemove while panning. They
// live in their own provider so a pan only re-renders the few things that
// position by it (the Canvas transform, the crosshair/ruler overlays) — never the
// annotations, which sit inside the transformed container and don't read pan.
interface PanContextType {
  panOffset: Point
  isPanning: boolean
  lastPanPoint: Point | null
  setPanOffset: (pan: Point) => void
  panTo: (x: number, y: number) => void
  resetView: () => void
  setIsPanning: (isPanning: boolean) => void
  setLastPanPoint: (point: Point | null) => void
}
const PanContext = createContext<PanContextType | undefined>(undefined)

// ── Selection ─────────────────────────────────────────────────────────────────
// The selected annotation changes on every click. In its own provider, a
// selection change re-renders only the AnnotationRenderer (which fans `isSelected`
// out as a prop) and the two affected shapes — not the whole canvas.
interface SelectionContextType {
  selectedAnnotation: any
  setSelectedAnnotation: (annotation: any) => void
}
const SelectionContext = createContext<SelectionContextType | undefined>(
  undefined
)

// ── Cursor position (high-frequency) ─────────────────────────────────────────
// The cursor moves on virtually every mousemove event. Keeping it inside the
// main canvas context would re-render every consumer (all annotations, the
// toolbar, panels…) on each move. We isolate it in its own provider and split
// the value from the setter: components that only WRITE the cursor (the event
// handlers) read the setter — whose identity is stable — so they never
// re-render, while only the crosshair/coordinate overlays subscribe to the value.
const CursorValueContext = createContext<Point | null>(null)
const CursorSetContext = createContext<(cursor: Point | null) => void>(() => {})

// ── Tool state (high-frequency during draw / move / resize) ───────────────────
// The live editing state (previewCoordinates, freeDrawPoints, tempAnnotation, the
// in-progress flags…) is rewritten on every throttled mousemove while drawing or
// editing a shape. Holding it in the main CanvasContext re-rendered EVERY
// annotation on each tick — they all subscribe to zoom/tool/selection there, so a
// new context value forced the whole list to reconcile. We give it its own
// provider (value + setter split, like the cursor) so a tool-state update only
// re-renders the Canvas shell and the single shape being edited — never the rest
// of the annotation list. Annotations must NOT read this context.
const ToolStateValueContext = createContext<ToolState>({})
const ToolStateSetContext = createContext<(state: Partial<ToolState>) => void>(
  () => {}
)

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
      selectedTool,
      contextMenu,
      container,
      showCrosshair,
      showCoordinates,
      setZoom,
      zoomIn,
      zoomOut,
      fitSignal,
      requestFit,
      setSelectedTool,
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
      selectedTool,
      contextMenu,
      container,
      showCrosshair,
      showCoordinates,
      setZoom,
      zoomIn,
      zoomOut,
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

  const panValue = useMemo<PanContextType>(
    () => ({
      panOffset,
      isPanning,
      lastPanPoint,
      setPanOffset,
      panTo,
      resetView,
      setIsPanning,
      setLastPanPoint,
    }),
    [panOffset, isPanning, lastPanPoint, panTo, resetView]
  )

  const selectionValue = useMemo<SelectionContextType>(
    () => ({ selectedAnnotation, setSelectedAnnotation }),
    [selectedAnnotation]
  )

  return (
    <CanvasContext.Provider value={value}>
      <PanContext.Provider value={panValue}>
        <SelectionContext.Provider value={selectionValue}>
          <ToolStateSetContext.Provider value={setToolState}>
            <ToolStateValueContext.Provider value={toolState}>
              <CursorProvider>{children}</CursorProvider>
            </ToolStateValueContext.Provider>
          </ToolStateSetContext.Provider>
        </SelectionContext.Provider>
      </PanContext.Provider>
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
  const { selectedTool, setSelectedTool } = useCanvas()
  return { selectedTool, setSelectedTool }
}

// Live tool/editing state. Consumers here re-render on every draw/move/resize
// tick — that's intentional and limited to the few that need it (the Canvas, the
// tool handlers, the coordinate overlay). Annotation components must NOT read
// this; they only need `selectedTool` from useCanvasTool() above, which stays put
// while a shape is being edited.
export const useCanvasToolState = () => {
  const toolState = useContext(ToolStateValueContext)
  const setToolState = useContext(ToolStateSetContext)
  return { toolState, setToolState }
}

const usePan = () => {
  const context = useContext(PanContext)
  if (!context) {
    throw new Error("usePan must be used within a CanvasProvider")
  }
  return context
}

const useSelection = () => {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error("useSelection must be used within a CanvasProvider")
  }
  return context
}

export const useCanvasZoom = () => {
  const { zoom, setZoom, zoomIn, zoomOut } = useCanvas()
  return { zoom, setZoom, zoomIn, zoomOut }
}

export const useCanvasPan = () => {
  const { panOffset, setPanOffset, panTo, resetView } = usePan()
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
  const { selectedAnnotation, setSelectedAnnotation } = useSelection()
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
  } = usePan()
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
