import { motion } from "framer-motion"
import { rgbToRgba } from "@/lib/utils"
import type { Annotation } from "@/lib/types"

interface TempAnnotationProps {
  annotation: Partial<Annotation>
}

export function TempAnnotation({ annotation }: TempAnnotationProps) {
  const styles = {
    fill: rgbToRgba(annotation.color, 0.2),
    stroke: annotation.color,
  }

  if (annotation.type === "box" && annotation.coordinates?.length === 2) {
    const [topLeft, bottomRight] = annotation.coordinates
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

  if (annotation.type === "polygon" && annotation.coordinates) {
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

  return null
}
