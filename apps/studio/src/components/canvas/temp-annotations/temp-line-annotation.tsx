import type { Annotation } from "@/types/core"
import { memo } from "react"

interface TempLineAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempLineAnnotation = memo(
  ({ annotation }: TempLineAnnotationProps) => {
    const coords = annotation.coordinates
    if (annotation.type !== "line" || !coords || coords.length < 2) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <line
          x1={coords[0].x}
          y1={coords[0].y}
          x2={coords[1].x}
          y2={coords[1].y}
          style={{
            stroke: "rgba(59, 130, 246)",
            strokeWidth: 2,
            strokeDasharray: "4 2",
          }}
        />
        {coords.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            style={{ fill: "rgba(59, 130, 246)", stroke: "white", strokeWidth: 1.5 }}
          />
        ))}
      </svg>
    )
  }
)

TempLineAnnotation.displayName = "TempLineAnnotation"
