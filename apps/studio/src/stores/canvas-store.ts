import { Annotation, ImageData, Point } from "@vailabel/core"
import React from "react"
import { create } from "zustand"

// Strongly typed tool state interface
export interface ToolState {
  // Common properties for all tools
  isDragging?: boolean
  startPoint?: Point | null
  currentPoint?: Point | null
  tempAnnotation?: Partial<Annotation> | null
  showLabelInput?: boolean

  // Move tool specific
  isResizing?: boolean
  resizeHandle?: string | null
  movingAnnotationId?: string | null
  resizingAnnotationId?: string | null
  movingOffset?: Point | null
  previewCoordinates?: Point[] | null

  // Polygon tool specific
  polygonPoints?: Point[]

  // Free draw tool specific
  isDrawing?: boolean
  freeDrawPoints?: Point[]

  // Allow additional properties with specific types
  [key: string]:
    | boolean
    | string
    | number
    | Point
    | Point[]
    | Annotation
    | Partial<Annotation>
    | null
    | undefined
}

const DEFAULT_TOOL_STATE = {
  type: "move",
  panOffset: { x: 0, y: 0 },
  contextMenuProps: {
    x: 0,
    y: 0,
    isOpen: false,
  },
  canvasContainerRef: React.createRef<HTMLDivElement>(),
  zoom: 1,
  isPanning: false,
  lastPanPoint: null,
  cursorPosition: null,
  selectedTool: "move",
  toolState: {},
  currentImage: null,
  showCrosshair: false,
  showCoordinates: false,
  selectedAnnotation: null,
  isResizing: false,
  resizeHandle: null,
  movingAnnotationId: null,
  movingOffset: null,
  isDragging: false,
  startPoint: null,
  currentPoint: null,
  tempAnnotation: null,
  showLabelInput: false,
}

export type CanvasStore = {
  canvasContainerRef: React.RefObject<HTMLDivElement | null>
  setCanvasContainerRef: (ref: React.RefObject<HTMLDivElement | null>) => void
  containerRect: DOMRect | null
  setContainerRect: (rect: DOMRect | null) => void
  contextMenuProps: {
    x: number
    y: number
    isOpen: boolean
  }
  setContextMenuProps: (props: {
    x: number
    y: number
    isOpen: boolean
  }) => void

  zoom: number
  panOffset: Point
  cursorPosition: Point | null
  selectedTool: string
  setZoom: (zoom: number) => void
  setPanOffset: (offset: Point) => void
  setCursorPosition: (point: Point | null) => void
  setSelectedTool: (tool: string) => void
  resetView: () => void
  setCanvasRef: (ref: React.RefObject<HTMLDivElement | null>) => void
  canvasRef: React.RefObject<HTMLDivElement | null>

  // Added for local state management
  isPanning: boolean
  setIsPanning: (isPanning: boolean) => void
  lastPanPoint: Point | null
  setLastPanPoint: (point: Point | null) => void
  // Tool state
  toolState: ToolState
  setToolState: (state: Partial<ToolState>) => void

  currentImage: ImageData | null
  setCurrentImage: (image: ImageData | null) => void
  showCrosshair: boolean
  setShowCrosshair: (show: boolean) => void
  showCoordinates: boolean
  setShowCoordinates: (show: boolean) => void

  selectedAnnotation: Annotation | null
  setSelectedAnnotation: (annotation: Annotation | null) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  ...DEFAULT_TOOL_STATE,
  canvasContainerRef: React.createRef<HTMLDivElement>(),
  setCanvasContainerRef: (ref) => set({ canvasContainerRef: ref }),
  containerRect: null,
  setContainerRect: (rect) => set({ containerRect: rect }),
  setContextMenuProps: (props: { x: number; y: number; isOpen: boolean }) =>
    set((state) => ({
      contextMenuProps: {
        ...state.contextMenuProps,
        ...props,
      },
    })),
  setZoom: (zoom) => set({ zoom }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setCursorPosition: (point) => set({ cursorPosition: point }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  canvasRef: React.createRef<HTMLDivElement>(),
  setIsPanning: (isPanning) => set({ isPanning }),
  setLastPanPoint: (point) => set({ lastPanPoint: point }),
  setToolState: (state) =>
    set((prevState) => ({
      toolState: { ...prevState.toolState, ...state },
    })),
  setCurrentImage: (image) => set({ currentImage: image }),
  setShowCrosshair: (show) => set({ showCrosshair: show }),
  setShowCoordinates: (show) => set({ showCoordinates: show }),
  setSelectedAnnotation: (annotationId) =>
    set({ selectedAnnotation: annotationId }),
}))
