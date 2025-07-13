import React from "react"
import { useCanvasStore } from "@/stores/canvas-store"

export const Crosshair: React.FC = () => {
  const { cursorPosition, zoom, panOffset } = useCanvasStore()

  if (!cursorPosition) return null

  return (
    <>
      <div
        className="absolute top-0 border-l border-blue-400 border-dashed pointer-events-none z-10"
        style={{
          left: `${cursorPosition.x * zoom + panOffset.x}px`,
          height: "100%",
        }}
      />
      <div
        className="absolute left-0 border-t border-blue-400 border-dashed pointer-events-none z-10"
        style={{
          top: `${cursorPosition.y * zoom + panOffset.y}px`,
          width: "100%",
        }}
      />
    </>
  )
}
