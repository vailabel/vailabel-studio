import type { Annotation } from "@/types/core"
import { useCanvasSelection } from "@/contexts/canvas-context"
import { memo } from "react"

interface PointAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
}

export const PointAnnotation = memo(
  ({ annotation, readOnly = false }: PointAnnotationProps) => {
    const { selectedAnnotation } = useCanvasSelection()
    const isSelected = selectedAnnotation?.id === annotation.id
    const point = annotation.coordinates[0]
    if (!point) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <circle
          cx={point.x}
          cy={point.y}
          r={isSelected ? 6 : 5}
          style={{
            fill: annotation.color,
            stroke: isSelected ? "#ef4444" : "white",
            strokeWidth: 2,
            strokeDasharray: readOnly ? "3 2" : "none",
          }}
        />
        <text
          x={point.x + 8}
          y={point.y - 8}
          style={{ fill: annotation.color }}
          className="text-xs"
        >
          {annotation.name}
        </text>
      </svg>
    )
  }
)

PointAnnotation.displayName = "PointAnnotation"
