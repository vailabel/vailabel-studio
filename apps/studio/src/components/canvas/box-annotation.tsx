import { memo, useMemo } from "react"
import { motion } from "framer-motion"
import { cn, getContentBoxColor } from "@/lib/utils"
import type { Annotation } from "@vailabel/core"
import { useCanvasTool, useCanvasSelection } from "@/contexts/canvas-context"

interface BoxAnnotationProps {
  annotation: Annotation
}

export const BoxAnnotation = memo(({ annotation }: BoxAnnotationProps) => {
  const { selectedTool } = useCanvasTool()
  const { selectedAnnotation } = useCanvasSelection()

  const isSelected = selectedAnnotation?.id === annotation.id
  const isMoveTool = selectedTool === "move"
  const annotationStyles = useMemo(
    () => ({
      left: annotation.coordinates[0].x,
      top: annotation.coordinates[0].y,
      width: annotation.coordinates[1].x - annotation.coordinates[0].x,
      height: annotation.coordinates[1].y - annotation.coordinates[0].y,
      backgroundColor: getContentBoxColor(annotation.color ?? "#333", 0.2),
      borderColor: annotation.color,
    }),
    [annotation.coordinates, annotation.color]
  )

  const labelStyles = useMemo(
    () => ({
      backgroundColor: annotation.color,
    }),
    [annotation.color]
  )

  // Memoize resize handles to prevent recreation on every render
  const resizeHandles = useMemo(() => {
    if (!isMoveTool) return null
    
    const handleOpacity = isSelected ? "opacity-100" : "opacity-60"
    const handleSize = isSelected ? "h-2 w-2" : "h-1.5 w-1.5"
    
    return (
      <>
        <div className={`absolute -top-1 -left-1 ${handleSize} cursor-nwse-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute -top-1 -right-1 ${handleSize} cursor-nesw-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute -bottom-1 -left-1 ${handleSize} cursor-nesw-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute -bottom-1 -right-1 ${handleSize} cursor-nwse-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute top-1/2 -left-1 ${handleSize} -translate-y-1/2 cursor-ew-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute top-1/2 -right-1 ${handleSize} -translate-y-1/2 cursor-ew-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute -top-1 left-1/2 ${handleSize} -translate-x-1/2 cursor-ns-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
        <div className={`absolute -bottom-1 left-1/2 ${handleSize} -translate-x-1/2 cursor-ns-resize bg-white border border-gray-400 ${handleOpacity} hover:opacity-100 transition-opacity`} />
      </>
    )
  }, [isMoveTool, isSelected])
  return (
    <motion.div
      data-testid="box-annotation"
      className={cn(
        "absolute border-2 bg-opacity-20",
        isSelected && "border-red-500"
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={annotationStyles}
    >
      <div
        style={labelStyles}
        className={cn("absolute -top-6 left-0 px-2 py-0.5 text-xs text-white")}
      >
        {annotation.name}
      </div>

      {resizeHandles}
    </motion.div>
  )
})
