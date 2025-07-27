import { motion } from "framer-motion"
import { rgbToRgba } from "../../lib/utils"
import type { Annotation, Point } from "@vailabel/core"
import { useCanvasStore } from "@/stores/canvas-store"
import { useAnnotationsStore } from "@/stores/annotation-store"
import { memo } from "react"

interface PolygonAnnotationProps {
  annotation: Annotation
  isTemporary?: boolean
}

export const PolygonAnnotation = memo(
  ({ annotation, isTemporary }: Readonly<PolygonAnnotationProps>) => {
    const { updateAnnotation } = useAnnotationsStore()
    const { zoom, selectedTool, selectedAnnotation } = useCanvasStore()

    const tempColor = "#2196f3" // blue for temp
    const styles = {
      fill: {
        selected: rgbToRgba(annotation.color, 0.5),
        aiGenerated: rgbToRgba(annotation.color, 0.5),
        default: rgbToRgba(annotation.color, 0.2),
        temp: rgbToRgba(tempColor, 0.15),
      },
      stroke: {
        selected: annotation.color,
        aiGenerated: annotation.color,
        default: annotation.color,
        temp: tempColor,
      },
      textFill: {
        selected: annotation.color,
        aiGenerated: annotation.color,
        default: "black",
        temp: tempColor,
      },
    }

    const isSelected = selectedAnnotation?.id === annotation.id
    const isAIGenerated = annotation.isAIGenerated

    // Helper to handle point drag
    const handlePointMouseDown = (
      e: React.MouseEvent<SVGCircleElement>,
      index: number
    ) => {
      e.stopPropagation()
      const svg = (e.target as SVGCircleElement).ownerSVGElement
      if (!svg) return
      const rect = svg.getBoundingClientRect()

      function onMouseMove(moveEvent: MouseEvent) {
        const newX = (moveEvent.clientX - rect.left) / zoom
        const newY = (moveEvent.clientY - rect.top) / zoom
        const newCoordinates = annotation.coordinates.map((p, i) =>
          i === index ? { x: newX, y: newY } : p
        )
        updateAnnotation(annotation.id, {
          coordinates: newCoordinates,
          updatedAt: new Date(),
        })
      }
      function onMouseUp() {
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
      }
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
    }

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          points={annotation.coordinates.map((p) => `${p.x},${p.y}`).join(" ")}
          style={{
            fill: isTemporary
              ? styles.fill.temp
              : isSelected
                ? styles.fill.selected
                : isAIGenerated
                  ? styles.fill.aiGenerated
                  : styles.fill.default,
            stroke: isTemporary
              ? styles.stroke.temp
              : isSelected
                ? styles.stroke.selected
                : isAIGenerated
                  ? styles.stroke.aiGenerated
                  : styles.stroke.default,
            strokeWidth: 2,
          }}
        />
        <text
          x={annotation.coordinates[0].x}
          y={annotation.coordinates[0].y - 10}
          style={{
            fill: isTemporary
              ? styles.textFill.temp
              : isSelected
                ? styles.textFill.selected
                : isAIGenerated
                  ? styles.textFill.aiGenerated
                  : styles.textFill.default,
          }}
          className="text-xs"
        >
          {annotation.name}
        </text>

        {isSelected && selectedTool === "move" && (
          <>
            {annotation.coordinates.map((point: Point, index: number) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={4 / zoom}
                className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto"
                onMouseDown={(e) => handlePointMouseDown(e, index)}
              />
            ))}
          </>
        )}
      </svg>
    )
  }
)
