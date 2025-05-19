import { motion } from "framer-motion"
import { rgbToRgba } from "../../lib/utils"
import type { Annotation, Point } from "@vailabel/core"
import { useAnnotations } from "@/hooks/use-annotations"
import { useCanvas } from "@/hooks/use-canvas"

interface PolygonAnnotationProps {
  annotation: Annotation
}

export function PolygonAnnotation({ annotation }: PolygonAnnotationProps) {
  const { selectedAnnotation } = useAnnotations()
  const { zoom, selectedTool } = useCanvas()

  const styles = {
    fill: {
      selected: rgbToRgba(annotation.color, 0.5),
      aiGenerated: rgbToRgba(annotation.color, 0.5),
      default: rgbToRgba(annotation.color, 0.2),
    },
    stroke: {
      selected: annotation.color,
      aiGenerated: annotation.color,
      default: annotation.color,
    },
    textFill: {
      selected: annotation.color,
      aiGenerated: annotation.color,
      default: "black",
    },
  }

  const isSelected = selectedAnnotation?.id === annotation.id
  const isAIGenerated = annotation.isAIGenerated

  return (
    <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        points={annotation.coordinates.map((p) => `${p.x},${p.y}`).join(" ")}
        style={{
          fill: isSelected
            ? styles.fill.selected
            : isAIGenerated
              ? styles.fill.aiGenerated
              : styles.fill.default,
          stroke: isSelected
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
          fill: isSelected
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
              className="fill-white stroke-gray-400 stroke-1 cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation()
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const rect = (
                    e.target as SVGCircleElement
                  ).ownerSVGElement?.getBoundingClientRect()
                  if (rect) {
                    const newX = (moveEvent.clientX - rect.left) / zoom
                    const newY = (moveEvent.clientY - rect.top) / zoom
                    annotation.coordinates[index] = { x: newX, y: newY }
                  }
                }
                const onMouseUp = () => {
                  window.removeEventListener("mousemove", onMouseMove)
                  window.removeEventListener("mouseup", onMouseUp)
                }
                window.addEventListener("mousemove", onMouseMove)
                window.addEventListener("mouseup", onMouseUp)
              }}
            />
          ))}
        </>
      )}
    </svg>
  )
}
