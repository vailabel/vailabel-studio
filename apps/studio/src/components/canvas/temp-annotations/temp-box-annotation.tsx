import { motion } from "framer-motion"
import type { Annotation } from "@vailabel/core"
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
    const styles = {
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: annotation.color,
    }

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <motion.rect
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
