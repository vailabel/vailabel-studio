import type { Annotation } from "@/types/core"
import { memo } from "react"

interface TempCircleAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempCircleAnnotation = memo(
  ({ annotation }: TempCircleAnnotationProps) => {
    const coords = annotation.coordinates
    if (annotation.type !== "circle" || !coords || coords.length < 2) return null

    const center = coords[0]
    const edge = coords[1]
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y)

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          style={{
            fill: "rgba(59, 130, 246, 0.2)",
            stroke: "rgba(59, 130, 246)",
            strokeWidth: 2,
            strokeDasharray: "4 2",
          }}
        />
        <circle cx={center.x} cy={center.y} r={3} style={{ fill: "rgba(59, 130, 246)" }} />
      </svg>
    )
  }
)

TempCircleAnnotation.displayName = "TempCircleAnnotation"
