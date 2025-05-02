import React from "react"
import type { Point } from "@/lib/types"

interface PositionCoordinatesProps {
  showCoordinates: boolean
  cursorPosition: Point | null
  uiZoom: number
  panOffset: Point
}

export const PositionCoordinates: React.FC<PositionCoordinatesProps> = ({
  showCoordinates,
  cursorPosition,
  uiZoom,
  panOffset,
}) => {
  if (!showCoordinates || !cursorPosition) return null

  return (
    <div
      className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs pointer-events-none z-20"
      style={{
        left: `${cursorPosition.x * uiZoom + panOffset.x + 10}px`,
        top: `${cursorPosition.y * uiZoom + panOffset.y + 10}px`,
      }}
    >
      x: {Math.round(cursorPosition.x)}, y: {Math.round(cursorPosition.y)}
    </div>
  )
}
