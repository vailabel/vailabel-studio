/**
 * Canvas Context Provider
 * Provides canvas-related functionality for the application
 * Uses React Query for state management following MVVM pattern
 */

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react"
import { useQuery, useMutation, useQueryClient } from "react-query"

// Canvas state interfaces
interface CanvasState {
  zoom: number
  pan: { x: number; y: number }
  cursor: { x: number; y: number }
  isDrawing: boolean
  selectedTool: string | null
  selection: any
  contextMenu: { visible: boolean; x: number; y: number; items: any[] }
  container: { width: number; height: number }
}

interface CanvasContextType extends CanvasState {
  // State setters
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setCursor: (cursor: { x: number; y: number }) => void
  setIsDrawing: (drawing: boolean) => void
  setSelectedTool: (tool: string | null) => void
  setSelection: (selection: any) => void
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
  const queryClient = useQueryClient()

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
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
    setPan({ x: 0, y: 0 })
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
    setPan({ x, y })
  }, [])

  const value: CanvasContextType = {
    // State
    zoom,
    pan,
    cursor,
    isDrawing,
    selectedTool,
    selection,
    contextMenu,
    container,

    // Setters
    setZoom,
    setPan,
    setCursor,
    setIsDrawing,
    setSelectedTool,
    setSelection,
    setContextMenu,
    setContainer,

    // Actions
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
    pan,
    cursor,
    isDrawing,
    selectedTool,
    selection,
    contextMenu,
    container,
  } = useCanvas()
  return {
    zoom,
    pan,
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
  const { pan, setPan, panTo } = useCanvas()
  return { pan, setPan, panTo }
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
  const { pan, setPan, panTo } = useCanvas()
  return { pan, setPan, panTo }
}
