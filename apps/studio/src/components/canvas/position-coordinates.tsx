import React, { useEffect, useState, memo, useMemo, useRef } from "react"
import { useCanvasCursor, useCanvasZoom, useCanvasPan, useCanvasTool } from "@/contexts/canvas-context"

export const PositionCoordinates: React.FC = memo(() => {
  const { cursorPosition } = useCanvasCursor()
  const { zoom } = useCanvasZoom()
  const { panOffset } = useCanvasPan()
  const { toolState } = useCanvasTool()
  
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 })
  const lastUpdateRef = useRef<number>(0)

  // Check if we're in an active operation that needs smooth updates
  const isActiveOperation = useMemo(() => {
    return toolState.isDragging || 
           toolState.isResizing || 
           toolState.isMoving || 
           toolState.isDrawing
  }, [toolState.isDragging, toolState.isResizing, toolState.isMoving, toolState.isDrawing])

  // More responsive throttling for position updates
  const shouldUpdate = useMemo(() => {
    const now = performance.now()
    const interval = isActiveOperation ? 50 : 200 // 20fps during operations, 5fps otherwise
    if (now - lastUpdateRef.current > interval) {
      lastUpdateRef.current = now
      return true
    }
    return false
  }, [isActiveOperation])

  // Memoize rounded coordinates to prevent recalculation
  const roundedCoords = useMemo(() => {
    if (!cursorPosition || !shouldUpdate) return null
    return {
      x: Math.round(cursorPosition.x),
      y: Math.round(cursorPosition.y)
    }
  }, [cursorPosition, shouldUpdate])

  useEffect(() => {
    if (!cursorPosition || !shouldUpdate) return

    const tooltipOffset = 10

    const calculatedLeft = cursorPosition.x * zoom + panOffset.x + tooltipOffset
    const calculatedTop = cursorPosition.y * zoom + panOffset.y + tooltipOffset

    // Simple positioning without canvas boundary checks for now
    const adjustedLeft = Math.max(calculatedLeft, tooltipOffset)
    const adjustedTop = Math.max(calculatedTop, tooltipOffset)

    setTooltipPosition({ left: adjustedLeft, top: adjustedTop })
  }, [cursorPosition, zoom, panOffset, shouldUpdate])

  if (!cursorPosition || !roundedCoords) return null

  return (
    <div
      data-testid="position-coordinates"
      className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs pointer-events-none z-20"
      style={{
        left: `${tooltipPosition.left}px`,
        top: `${tooltipPosition.top}px`,
      }}
    >
      x: {roundedCoords.x}, y: {roundedCoords.y}
    </div>
  )
})
