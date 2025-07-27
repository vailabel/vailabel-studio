import { memo, useMemo } from "react"
import { motion } from "framer-motion"
import { cn, getContentBoxColor } from "@/lib/utils"
import type { Annotation } from "@vailabel/core"
import { useCanvasStore } from "@/stores/canvas-store"

interface BoxAnnotationProps {
  annotation: Annotation
  isTemporary?: boolean
}

export const BoxAnnotation = memo(
  ({ annotation, isTemporary }: BoxAnnotationProps) => {
    const { selectedTool, selectedAnnotation } = useCanvasStore()

    const isSelected = selectedAnnotation?.id === annotation.id
    const tempColor = "#2196f3"
    const annotationStyles = useMemo(
      () => ({
        left: annotation.coordinates[0].x,
        top: annotation.coordinates[0].y,
        width: annotation.coordinates[1].x - annotation.coordinates[0].x,
        height: annotation.coordinates[1].y - annotation.coordinates[0].y,
        backgroundColor: isTemporary
          ? "rgba(33,150,243,0.15)"
          : getContentBoxColor(annotation.color ?? "#333", 0.2),
        borderColor: isTemporary ? tempColor : annotation.color,
      }),
      [annotation, isTemporary]
    )

    const labelStyles = useMemo(
      () => ({
        backgroundColor: isTemporary ? tempColor : annotation.color,
      }),
      [annotation.color, isTemporary]
    )
    return (
      <motion.div
        data-testid="box-annotation"
        className={cn(
          "absolute border-2 bg-opacity-20",
          isSelected && !isTemporary && "border-red-500"
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={annotationStyles}
      >
        <div
          style={labelStyles}
          className={cn(
            "absolute -top-6 left-0 px-2 py-0.5 text-xs text-white"
          )}
        >
          {annotation.name}
        </div>

        {isSelected && selectedTool === "move" && !isTemporary && (
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
)
