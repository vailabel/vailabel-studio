import { ImageData, Point } from "@vailabel/core"
import React from "react"
import { create } from "zustand"

type CanvasStore = {
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

  currentImage: ImageData | null
  setCurrentImage: (image: ImageData | null) => void
  showCrosshair: boolean
  setShowCrosshair: (show: boolean) => void
  showCoordinates: boolean
  setShowCoordinates: (show: boolean) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvasContainerRef: React.createRef<HTMLDivElement>(),
  setCanvasContainerRef: (ref) => set({ canvasContainerRef: ref }),
  containerRect: null,
  setContainerRect: (rect) => set({ containerRect: rect }),
  contextMenuProps: {
    x: 0,
    y: 0,
    isOpen: false,
  },
  setContextMenuProps: (props: { x: number; y: number; isOpen: boolean }) =>
    set((state) => ({
      contextMenuProps: {
        ...state.contextMenuProps,
        ...props,
      },
    })),

  zoom: 1,
  panOffset: { x: 0, y: 0 },
  cursorPosition: null,
  selectedTool: "box",
  setZoom: (zoom) => set({ zoom }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setCursorPosition: (point) => set({ cursorPosition: point }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  canvasRef: React.createRef<HTMLDivElement>(),
  currentImage: null,
  setCurrentImage: (image) => set({ currentImage: image }),
  showCrosshair: false,
  setShowCrosshair: (show) => set({ showCrosshair: show }),
  showCoordinates: false,
  setShowCoordinates: (show) => set({ showCoordinates: show }),
}))
