import React, { memo, useMemo } from "react"
import { useCanvasStore } from "@/stores/canvas-store"

export const Crosshair: React.FC = memo(() => {
  const { cursorPosition, zoom, panOffset } = useCanvasStore()

  const verticalStyle = useMemo(() => {
    if (!cursorPosition) return null
    return {
      left: `${cursorPosition.x * zoom + panOffset.x}px`,
      height: "100%",
    }
  }, [cursorPosition, zoom, panOffset.x])

  const horizontalStyle = useMemo(() => {
    if (!cursorPosition) return null
    return {
      top: `${cursorPosition.y * zoom + panOffset.y}px`,
      width: "100%",
    }
  }, [cursorPosition, zoom, panOffset.y])

  if (!cursorPosition) return null

  return (
    <>
      <div
        className="absolute top-0 border-l border-blue-400 border-dashed pointer-events-none z-10"
        style={verticalStyle || {}}
      />
      <div
        className="absolute left-0 border-t border-blue-400 border-dashed pointer-events-none z-10"
        style={horizontalStyle || {}}
      />
    </>
  )
})
