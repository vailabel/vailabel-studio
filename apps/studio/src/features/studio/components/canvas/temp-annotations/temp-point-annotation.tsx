import type { Annotation } from "@/shared/types/core"
import { memo } from "react"

interface TempPointAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempPointAnnotation = memo(
  ({ annotation }: TempPointAnnotationProps) => {
    const point = annotation.coordinates?.[0]
    if (annotation.type !== "point" || !point) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <circle
          cx={point.x}
          cy={point.y}
          r={5}
          style={{
            fill: "rgba(59, 130, 246)",
            stroke: "white",
            strokeWidth: 2,
          }}
        />
      </svg>
    )
  }
)

TempPointAnnotation.displayName = "TempPointAnnotation"
