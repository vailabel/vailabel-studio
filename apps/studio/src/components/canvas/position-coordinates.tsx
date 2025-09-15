import React, { useEffect, useMemo, useState } from "react"
import { useCanvasStore } from "@/stores/canvas-store"

export const PositionCoordinates: React.FC = () => {
  const { zoom, panOffset, cursorPosition, canvasRef } = useCanvasStore()
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 })

  const canvasRect = useMemo(() => {
    return canvasRef?.current?.getBoundingClientRect()
  }, [canvasRef?.current])

  useEffect(() => {
    if (!cursorPosition || !canvasRect) return

    const tooltipOffset = 10
    const tooltipWidth = 100
    const tooltipHeight = 30
    // Use memoized rect to avoid reflow on every mouse move

    const calculatedLeft = cursorPosition.x * zoom + panOffset.x + tooltipOffset
    const calculatedTop = cursorPosition.y * zoom + panOffset.y + tooltipOffset

    const adjustedLeft =
      calculatedLeft + tooltipWidth > canvasRect.width
        ? Math.max(calculatedLeft - tooltipWidth - tooltipOffset, tooltipOffset)
        : Math.max(calculatedLeft, tooltipOffset)

    const adjustedTop =
      calculatedTop + tooltipHeight > canvasRect.height
        ? Math.max(calculatedTop - tooltipHeight - tooltipOffset, tooltipOffset)
        : Math.max(calculatedTop, tooltipOffset)

    setTooltipPosition({ left: adjustedLeft, top: adjustedTop })
  }, [cursorPosition, zoom, panOffset, canvasRect])

  if (!cursorPosition) return null

  return (
    <div
      data-testid="position-coordinates"
      className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs pointer-events-none z-20"
      style={{
        left: `${tooltipPosition.left}px`,
        top: `${tooltipPosition.top}px`,
      }}
    >
      x: {Math.round(cursorPosition.x)}, y: {Math.round(cursorPosition.y)}
    </div>
  )
}
