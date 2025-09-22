import React, { memo, useMemo } from "react"
import { useCanvasCursor, useCanvasPan, useCanvasState } from "@/contexts/canvas-context"

interface CrosshairProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
}

export const Crosshair: React.FC<CrosshairProps> = memo(({ canvasRef }) => {
  // Use selective hooks for better performance - only re-render when these specific values change
  const { cursorPosition } = useCanvasCursor()
  const { panOffset } = useCanvasPan()
  const { zoom } = useCanvasState<{ zoom: number }>(state => ({ zoom: state.zoom }))

  // Render crosshair immediately when cursor position changes - no throttling
  const styles = useMemo(() => {
    if (!cursorPosition || !canvasRef?.current) return null
    
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = canvasRect.width
    const canvasHeight = canvasRect.height
    
    // Calculate crosshair position in canvas coordinates
    const crosshairX = cursorPosition.x * zoom + panOffset.x
    const crosshairY = cursorPosition.y * zoom + panOffset.y
    
    // Check if crosshair is within canvas boundaries
    const isWithinCanvas = crosshairX >= 0 && crosshairX <= canvasWidth && 
                          crosshairY >= 0 && crosshairY <= canvasHeight
    
    if (!isWithinCanvas) return null
    
    return {
      vertical: {
        left: `${crosshairX}px`,
        height: `${canvasHeight}px`,
        top: '0px',
      },
      horizontal: {
        top: `${crosshairY}px`,
        width: `${canvasWidth}px`,
        left: '0px',
      }
    }
  }, [cursorPosition, zoom, panOffset.x, panOffset.y, canvasRef])

  if (!cursorPosition || !styles) return null

  return (
    <div data-testid="crosshair">
      <div
        className="absolute border-l border-blue-400 border-dashed pointer-events-none z-10"
        style={styles.vertical}
      />
      <div
        className="absolute border-t border-blue-400 border-dashed pointer-events-none z-10"
        style={styles.horizontal}
      />
    </div>
  )
})
