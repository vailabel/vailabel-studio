import React, { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from "react"
import { Annotation, Point } from "@vailabel/core"

// Canvas state interface
export interface CanvasState {
  // View state
  zoom: number
  panOffset: Point
  cursorPosition: Point | null
  
  // Tool state
  selectedTool: string
  isPanning: boolean
  lastPanPoint: Point | null
  
  // Annotation state
  selectedAnnotation: Annotation | null
  
  // UI state
  showCrosshair: boolean
  showCoordinates: boolean
  
  // Context menu state
  contextMenuProps: {
    x: number
    y: number
    isOpen: boolean
  }
  
  // Container state
  canvasContainerRef: React.RefObject<HTMLDivElement | null>
  containerRect: DOMRect | null
  
  // Tool-specific state
  toolState: {
    isDragging?: boolean
    isResizing?: boolean
    isMoving?: boolean
    isDrawing?: boolean
    resizeHandle?: string | null
    movingAnnotationId?: string | null
    resizingAnnotationId?: string | null
    movingOffset?: Point | null
    previewCoordinates?: Point[] | null
    tempAnnotation?: Partial<Annotation> | null
    showLabelInput?: boolean
    polygonPoints?: Point[]
    freeDrawPoints?: Point[]
  }
}

// Action types
type CanvasAction =
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN_OFFSET'; payload: Point }
  | { type: 'SET_CURSOR_POSITION'; payload: Point | null }
  | { type: 'SET_SELECTED_TOOL'; payload: string }
  | { type: 'SET_IS_PANNING'; payload: boolean }
  | { type: 'SET_LAST_PAN_POINT'; payload: Point | null }
  | { type: 'SET_SELECTED_ANNOTATION'; payload: Annotation | null }
  | { type: 'SET_TOOL_STATE'; payload: Partial<CanvasState['toolState']> }
  | { type: 'SET_CONTEXT_MENU_PROPS'; payload: CanvasState['contextMenuProps'] }
  | { type: 'SET_CANVAS_CONTAINER_REF'; payload: React.RefObject<HTMLDivElement | null> }
  | { type: 'SET_CONTAINER_RECT'; payload: DOMRect | null }
  | { type: 'RESET_VIEW' }
  | { type: 'RESET_TOOL_STATE' }

// Initial state
const initialState: CanvasState = {
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  cursorPosition: null,
  selectedTool: "move",
  isPanning: false,
  lastPanPoint: null,
  selectedAnnotation: null,
  showCrosshair: false,
  showCoordinates: false,
  contextMenuProps: {
    x: 0,
    y: 0,
    isOpen: false,
  },
  canvasContainerRef: { current: null },
  containerRect: null,
  toolState: {}
}

// Reducer
function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload }
    
    case 'SET_PAN_OFFSET':
      return { ...state, panOffset: action.payload }
    
    case 'SET_CURSOR_POSITION':
      // Only update if position actually changed significantly
      if (!state.cursorPosition || 
          !action.payload ||
          Math.abs(state.cursorPosition.x - action.payload.x) > 0.5 || 
          Math.abs(state.cursorPosition.y - action.payload.y) > 0.5) {
        return { ...state, cursorPosition: action.payload }
      }
      return state
    
    case 'SET_SELECTED_TOOL':
      return { ...state, selectedTool: action.payload }
    
    case 'SET_IS_PANNING':
      return { ...state, isPanning: action.payload }
    
    case 'SET_LAST_PAN_POINT':
      return { ...state, lastPanPoint: action.payload }
    
    case 'SET_SELECTED_ANNOTATION':
      return { ...state, selectedAnnotation: action.payload }
    
    case 'SET_TOOL_STATE':
      return { 
        ...state, 
        toolState: { ...state.toolState, ...action.payload }
      }
    
    case 'SET_CONTEXT_MENU_PROPS':
      return { 
        ...state, 
        contextMenuProps: action.payload
      }
    
    case 'SET_CANVAS_CONTAINER_REF':
      return { 
        ...state, 
        canvasContainerRef: action.payload
      }
    
    case 'SET_CONTAINER_RECT':
      return { 
        ...state, 
        containerRect: action.payload
      }
    
    case 'RESET_VIEW':
      return { 
        ...state, 
        zoom: 1, 
        panOffset: { x: 0, y: 0 },
        cursorPosition: null
      }
    
    case 'RESET_TOOL_STATE':
      return { 
        ...state, 
        toolState: {},
        selectedAnnotation: null
      }
    
    default:
      return state
  }
}

// Context
const CanvasContext = createContext<{
  state: CanvasState
  dispatch: React.Dispatch<CanvasAction>
} | null>(null)

// Provider component
export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(canvasReducer, initialState)

  return (
    <CanvasContext.Provider value={{ state, dispatch }}>
      {children}
    </CanvasContext.Provider>
  )
}

// Hook to use canvas context
export function useCanvasContext() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider')
  }
  return context
}

// Selective hooks for better performance
export function useCanvasZoom() {
  const { state, dispatch } = useCanvasContext()
  const setZoom = useCallback((zoom: number) => 
    dispatch({ type: 'SET_ZOOM', payload: zoom }), [dispatch])
  
  return useMemo(() => ({
    zoom: state.zoom,
    setZoom
  }), [state.zoom, setZoom])
}

export function useCanvasPan() {
  const { state, dispatch } = useCanvasContext()
  const setPanOffset = useCallback((panOffset: Point) => 
    dispatch({ type: 'SET_PAN_OFFSET', payload: panOffset }), [dispatch])
  const resetView = useCallback(() => 
    dispatch({ type: 'RESET_VIEW' }), [dispatch])
  
  return useMemo(() => ({
    panOffset: state.panOffset,
    setPanOffset,
    resetView
  }), [state.panOffset, setPanOffset, resetView])
}

export function useCanvasCursor() {
  const { state, dispatch } = useCanvasContext()
  const setCursorPosition = useCallback((cursorPosition: Point | null) => 
    dispatch({ type: 'SET_CURSOR_POSITION', payload: cursorPosition }), [dispatch])
  
  return useMemo(() => ({
    cursorPosition: state.cursorPosition,
    setCursorPosition
  }), [state.cursorPosition, setCursorPosition])
}

export function useCanvasTool() {
  const { state, dispatch } = useCanvasContext()
  const setSelectedTool = useCallback((selectedTool: string) => 
    dispatch({ type: 'SET_SELECTED_TOOL', payload: selectedTool }), [dispatch])
  const setToolState = useCallback((toolState: Partial<CanvasState['toolState']>) => 
    dispatch({ type: 'SET_TOOL_STATE', payload: toolState }), [dispatch])
  const resetToolState = useCallback(() => 
    dispatch({ type: 'RESET_TOOL_STATE' }), [dispatch])
  
  return useMemo(() => ({
    selectedTool: state.selectedTool,
    setSelectedTool,
    toolState: state.toolState,
    setToolState,
    resetToolState
  }), [state.selectedTool, state.toolState, setSelectedTool, setToolState, resetToolState])
}

export function useCanvasPanning() {
  const { state, dispatch } = useCanvasContext()
  const setIsPanning = useCallback((isPanning: boolean) => 
    dispatch({ type: 'SET_IS_PANNING', payload: isPanning }), [dispatch])
  const setLastPanPoint = useCallback((lastPanPoint: Point | null) => 
    dispatch({ type: 'SET_LAST_PAN_POINT', payload: lastPanPoint }), [dispatch])
  
  return useMemo(() => ({
    isPanning: state.isPanning,
    setIsPanning,
    lastPanPoint: state.lastPanPoint,
    setLastPanPoint
  }), [state.isPanning, state.lastPanPoint, setIsPanning, setLastPanPoint])
}

export function useCanvasSelection() {
  const { state, dispatch } = useCanvasContext()
  const setSelectedAnnotation = useCallback((selectedAnnotation: Annotation | null) => 
    dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: selectedAnnotation }), [dispatch])
  
  return useMemo(() => ({
    selectedAnnotation: state.selectedAnnotation,
    setSelectedAnnotation
  }), [state.selectedAnnotation, setSelectedAnnotation])
}

export function useCanvasContextMenu() {
  const { state, dispatch } = useCanvasContext()
  const setContextMenuProps = useCallback((contextMenuProps: CanvasState['contextMenuProps']) => 
    dispatch({ type: 'SET_CONTEXT_MENU_PROPS', payload: contextMenuProps }), [dispatch])
  
  return useMemo(() => ({
    contextMenuProps: state.contextMenuProps,
    setContextMenuProps
  }), [state.contextMenuProps, setContextMenuProps])
}

export function useCanvasContainer() {
  const { state, dispatch } = useCanvasContext()
  const setCanvasContainerRef = useCallback((canvasContainerRef: React.RefObject<HTMLDivElement | null>) => 
    dispatch({ type: 'SET_CANVAS_CONTAINER_REF', payload: canvasContainerRef }), [dispatch])
  const setContainerRect = useCallback((containerRect: DOMRect | null) => 
    dispatch({ type: 'SET_CONTAINER_RECT', payload: containerRect }), [dispatch])
  
  return useMemo(() => ({
    canvasContainerRef: state.canvasContainerRef,
    containerRect: state.containerRect,
    setCanvasContainerRef,
    setContainerRect
  }), [state.canvasContainerRef, state.containerRect, setCanvasContainerRef, setContainerRect])
}

// Performance-optimized hook for components that need multiple values
export function useCanvasState<T = CanvasState>(selector?: (state: CanvasState) => T): T | CanvasState {
  const { state } = useCanvasContext()
  
  const selectedState = useMemo(() => {
    return selector ? selector(state) : state
  }, [state, selector])
  
  return selectedState as T | CanvasState
}
