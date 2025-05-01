import React from "react"
import type { Point } from "@/lib/types"

interface CrosshairsProps {
  showCrosshairs: boolean
  cursorPosition: Point | null
  uiZoom: number
  panOffset: Point
}

export const Crosshairs: React.FC<CrosshairsProps> = React.memo(
  ({ showCrosshairs, cursorPosition, uiZoom, panOffset }) => {
    if (!showCrosshairs || !cursorPosition) return null

    return (
      <>
        <div
          className="absolute top-0 border-l border-blue-400 border-dashed pointer-events-none z-10"
          style={{
            left: `${cursorPosition.x * uiZoom + panOffset.x}px`,
            height: "100%",
          }}
        />
        <div
          className="absolute left-0 border-t border-blue-400 border-dashed pointer-events-none z-10"
          style={{
            top: `${cursorPosition.y * uiZoom + panOffset.y}px`,
            width: "100%",
          }}
        />
      </>
    )
  }
)
