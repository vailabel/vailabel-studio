import { Annotation, ImageData, Point } from "@vailabel/core"
import React from "react"
import { create } from "zustand"

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolState: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setToolState: (state: Record<string, any>) => void

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
  setToolState: (state) => set({ toolState: state }),
  setCurrentImage: (image) => set({ currentImage: image }),
  setShowCrosshair: (show) => set({ showCrosshair: show }),
  setShowCoordinates: (show) => set({ showCoordinates: show }),
  setSelectedAnnotation: (annotationId) =>
    set({ selectedAnnotation: annotationId }),
}))
