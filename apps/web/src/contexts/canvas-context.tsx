

import { createContext, useContext, useCallback, useState } from "react"
import type { Point } from "@/lib/types"

type CanvasContextType = {
  zoom: number
  panOffset: Point
  cursorPosition: Point | null
  selectedTool: string
  setZoom: (zoom: number) => void
  setPanOffset: (offset: Point) => void
  setCursorPosition: (point: Point | null) => void
  setSelectedTool: (tool: string) => void
  resetView: () => void
}

const CanvasContext = createContext<CanvasContextType | null>(null)

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  const [selectedTool, setSelectedTool] = useState("move")

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
      }}
    >
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (!context) throw new Error("useCanvas must be used within CanvasProvider")
  return context
}
