import React from "react"
import { useCanvas } from "@/contexts/canvas-context"

export const PositionCoordinates: React.FC = () => {
  const { zoom, panOffset, cursorPosition } = useCanvas()

  if (!cursorPosition) return null

  return (
    <div
      className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs pointer-events-none z-20"
      style={{
        left: `${cursorPosition.x * zoom + panOffset.x + 10}px`,
        top: `${cursorPosition.y * zoom + panOffset.y + 10}px`,
      }}
    >
      x: {Math.round(cursorPosition.x)}, y: {Math.round(cursorPosition.y)}
    </div>
  )
}
