import type { Annotation } from "@/types/core"
import { memo } from "react"

interface TempLinestripAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempLinestripAnnotation = memo(
  ({ annotation }: TempLinestripAnnotationProps) => {
    const coords = annotation.coordinates
    if (annotation.type !== "linestrip" || !coords || coords.length === 0) {
      return null
    }

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        {coords.length > 1 && (
          <polyline
            points={coords.map((p) => `${p.x},${p.y}`).join(" ")}
            style={{
              fill: "none",
              stroke: "rgba(59, 130, 246)",
              strokeWidth: 2,
              strokeDasharray: "4 2",
            }}
          />
        )}
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

TempLinestripAnnotation.displayName = "TempLinestripAnnotation"
