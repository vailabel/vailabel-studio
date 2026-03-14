/**
 * Canvas Context Provider
 * Provides canvas-related functionality for the application
 * Stores canvas-only interaction state for the studio workspace
 */

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react"

// Canvas state interfaces
interface CanvasState {
  zoom: number
  panOffset: { x: number; y: number }
  cursor: { x: number; y: number }
  isDrawing: boolean
  selectedTool: string | null
  selection: any
  contextMenu: { visible: boolean; x: number; y: number; items: any[] }
  container: { width: number; height: number }
}

interface CanvasContextType extends CanvasState {
  setZoom: (zoom: number) => void
  setPanOffset: (pan: { x: number; y: number }) => void
  setCursor: (cursor: { x: number; y: number }) => void
  setIsDrawing: (drawing: boolean) => void
  setToolState: (state: Partial<Pick<CanvasContextType, "selectedTool">> & {
    tempAnnotation?: any
    showLabelInput?: boolean
    resizingAnnotationId?: string | null
    movingAnnotationId?: string | null
    previewCoordinates?: any
    polygonPoints?: any[]
  }) => void
  setSelectedTool: (tool: string | null) => void
  setSelection: (selection: any) => void
  setSelectedAnnotation: (selection: any) => void
  setContextMenu: (menu: {
    visible: boolean
    x: number
    y: number
    items: any[]
  }) => void
  setContainer: (container: { width: number; height: number }) => void

  // Actions
  resetCanvas: () => void
  zoomIn: () => void
  zoomOut: () => void
  panTo: (x: number, y: number) => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

interface CanvasProviderProps {
  children: ReactNode
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [selection, setSelection] = useState(null)
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  })
  const [container, setContainer] = useState({ width: 0, height: 0 })

  // Canvas actions
  const resetCanvas = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    setCursor({ x: 0, y: 0 })
    setIsDrawing(false)
    setSelectedTool(null)
    setSelection(null)
    setContextMenu({ visible: false, x: 0, y: 0, items: [] })
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 5))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1))
  }, [])

  const panTo = useCallback((x: number, y: number) => {
    setPanOffset({ x, y })
  }, [])

  const setToolState = useCallback(
    (state: Partial<Pick<CanvasContextType, "selectedTool">>) => {
      if (state.selectedTool !== undefined) {
        setSelectedTool(state.selectedTool)
      }
    },
    []
  )

  const value: CanvasContextType = {
    zoom,
    panOffset,
    cursor,
    isDrawing,
    selectedTool,
    selection,
    contextMenu,
    container,

    setZoom,
    setPanOffset,
    setCursor,
    setIsDrawing,
    setToolState,
    setSelectedTool,
    setSelection,
    setSelectedAnnotation: setSelection,
    setContextMenu,
    setContainer,

    resetCanvas,
    zoomIn,
    zoomOut,
    panTo,
  }

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  )
}

// Hook exports for backward compatibility
export const useCanvas = (): CanvasContextType => {
  const context = useContext(CanvasContext)
  if (context === undefined) {
    throw new Error("useCanvas must be used within a CanvasProvider")
  }
  return context
}

export const useCanvasState = () => {
  const {
    zoom,
    panOffset,
    cursor,
    isDrawing,
    selectedTool,
    selection,
    contextMenu,
    container,
  } = useCanvas()
  return {
    zoom,
    panOffset,
    cursor,
    isDrawing,
    selectedTool,
    selection,
    contextMenu,
    container,
  }
}

export const useCanvasTool = () => {
  const { selectedTool, setSelectedTool } = useCanvas()
  return { selectedTool, setSelectedTool }
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
  const { cursor, setCursor } = useCanvas()
  return { cursor, setCursor }
}

export const useCanvasSelection = () => {
  const { selection, setSelection } = useCanvas()
  return { selection, setSelection }
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
  const { panOffset, setPanOffset, panTo } = useCanvas()
  return { panOffset, setPanOffset, panTo }
}
