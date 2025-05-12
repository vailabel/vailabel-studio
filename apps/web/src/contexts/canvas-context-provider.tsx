import { createContext, useCallback, useState } from "react"
import type { Point } from "@/lib/types"

export type CanvasContextType = {
  zoom: number
  panOffset: Point
  cursorPosition: Point | null
  selectedTool: string
  setZoom: (zoom: number) => void
  setPanOffset: (offset: Point) => void
  setCursorPosition: (point: Point | null) => void
  setSelectedTool: (tool: string) => void
  resetView: () => void
  setCanvasRef: (ref: React.RefObject<HTMLDivElement> | null) => void
  canvasRef: React.RefObject<HTMLDivElement> | null
}

export const CanvasContext = createContext<CanvasContextType | null>(null)

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  const [selectedTool, setSelectedTool] = useState("move")
  const [canvasRef, setCanvasRef] =
    useState<React.RefObject<HTMLDivElement> | null>(null)

  const resetView = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  return (
    <CanvasContext.Provider
      value={{
        zoom,
        panOffset,
        cursorPosition,
        selectedTool,
        setZoom,
        setPanOffset,
        setCursorPosition,
        setSelectedTool,
        resetView,
        setCanvasRef,
        canvasRef,
      }}
    >
      {children}
    </CanvasContext.Provider>
  )
}
