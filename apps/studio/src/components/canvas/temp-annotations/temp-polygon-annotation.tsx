import { motion } from "framer-motion"
import type { Annotation } from "@vailabel/core"
import { memo } from "react"

interface TempPolygonAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempPolygonAnnotation = memo(
  ({ annotation }: TempPolygonAnnotationProps) => {
    if (annotation.type !== "polygon" || !annotation.coordinates) {
      return null
    }

    const styles = {
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: 'rgba(59, 130, 246)',
    }

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          points={annotation.coordinates.map((p) => `${p.x},${p.y}`).join(" ")}
          style={{
            fill: styles.fill,
            stroke: styles.stroke,
            strokeWidth: 2,
          }}
        />
      </svg>
    )
  }
)

TempPolygonAnnotation.displayName = "TempPolygonAnnotation"
