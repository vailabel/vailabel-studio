import type { Annotation } from "@/types/core"
import { getContentBoxColor } from "@/lib/utils"
import { memo } from "react"

interface TempBoxAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempBoxAnnotation = memo(
  ({ annotation }: TempBoxAnnotationProps) => {
    if (
      annotation.type !== "box" ||
      !annotation.coordinates ||
      annotation.coordinates.length !== 2
    ) {
      return null
    }

    const [topLeft, bottomRight] = annotation.coordinates
    const color = annotation.color ?? "#3b82f6"
    const styles = {
      fill: getContentBoxColor(color, 0.5),
      stroke: color,
    }

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <rect
          x={topLeft.x}
          y={topLeft.y}
          width={bottomRight.x - topLeft.x}
          height={bottomRight.y - topLeft.y}
          style={{
            fill: styles.fill,
            stroke: styles.stroke,
            strokeWidth: 2,
            strokeDasharray: "4 2", // Dotted line
          }}
        />
      </svg>
    )
  }
)

TempBoxAnnotation.displayName = "TempBoxAnnotation"

