import { motion } from "framer-motion"
import { cn, rgbToRgba } from "@/lib/utils"
import type { Annotation } from "@/lib/types"
import { useCanvas } from "@/contexts/canvas-context"
import { useAnnotations } from "@/hooks/use-annotations"

interface BoxAnnotationProps {
  annotation: Annotation
}

export function BoxAnnotation({ annotation }: BoxAnnotationProps) {
  const { selectedTool } = useCanvas()
  const { selectedAnnotation } = useAnnotations()
  return (
    <motion.div
      className={cn(
        "absolute border-2 bg-opacity-20",
        selectedAnnotation?.id === annotation.id && "border-red-500"
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        left: annotation.coordinates[0].x,
        top: annotation.coordinates[0].y,
        width: annotation.coordinates[1].x - annotation.coordinates[0].x,
        height: annotation.coordinates[1].y - annotation.coordinates[0].y,
        backgroundColor: rgbToRgba(annotation.color ?? "blue", 0.2),
        borderColor: annotation.color ?? "blue",
      }}
    >
      <div
        style={{
          backgroundColor: annotation.color ?? "blue",
        }}
        className={cn("absolute -top-6 left-0 px-2 py-0.5 text-xs text-white")}
      >
        {annotation.name}
      </div>

      {selectedAnnotation?.id == annotation.id && selectedTool === "move" && (
        <>
          <div className="absolute -top-1 -left-1 h-2 w-2 cursor-nwse-resize bg-white border border-gray-400" />
          <div className="absolute -top-1 -right-1 h-2 w-2 cursor-nesw-resize bg-white border border-gray-400" />
          <div className="absolute -bottom-1 -left-1 h-2 w-2 cursor-nesw-resize bg-white border border-gray-400" />
          <div className="absolute -bottom-1 -right-1 h-2 w-2 cursor-nwse-resize bg-white border border-gray-400" />
          <div className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 cursor-ew-resize bg-white border border-gray-400" />
          <div className="absolute top-1/2 -right-1 h-2 w-2 -translate-y-1/2 cursor-ew-resize bg-white border border-gray-400" />
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 cursor-ns-resize bg-white border border-gray-400" />
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 cursor-ns-resize bg-white border border-gray-400" />
        </>
      )}
    </motion.div>
  )
}
