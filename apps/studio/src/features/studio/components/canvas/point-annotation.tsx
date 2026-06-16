import type { Annotation } from "@/shared/types/core"
import { useCanvasZoom } from "@/features/studio/canvas-state/canvas-context"
import { AnnotationLabel, dashFor, strokeWidthFor } from "./annotation-styles"
import { memo } from "react"

interface PointAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
}

export const PointAnnotation = memo(
  ({ annotation, readOnly = false, isSelected = false }: PointAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const point = annotation.coordinates[0]
    if (!point) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <circle
          cx={point.x}
          cy={point.y}
          r={(isSelected ? 6 : 5) / (zoom || 1)}
          vectorEffect="non-scaling-stroke"
          style={{
            fill: annotation.color,
            stroke: "white",
            strokeWidth: strokeWidthFor(isSelected),
            strokeDasharray: dashFor(readOnly),
          }}
        />
        <AnnotationLabel
          x={point.x}
          y={point.y}
          color={annotation.color ?? "#3b82f6"}
          name={annotation.name}
          zoom={zoom}
        />
      </svg>
    )
  }
)

PointAnnotation.displayName = "PointAnnotation"
