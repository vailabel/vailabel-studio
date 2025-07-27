import { motion } from "framer-motion"
import { rgbToRgba } from "@/lib/utils"
import type { Annotation } from "@vailabel/core"
import { memo } from "react"

interface TempAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempAnnotation = memo(({ annotation }: TempAnnotationProps) => {
  const styles = {
    fill: rgbToRgba(annotation.color ?? "#333", 0.2),
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

  if (
    annotation.type === "freeDraw" &&
    annotation.coordinates &&
    annotation.coordinates.length > 0
  ) {
    // Create smooth SVG path from coordinates
    let pathData = ""

    if (annotation.coordinates.length === 1) {
      const point = annotation.coordinates[0]
      pathData = `M ${point.x} ${point.y} L ${point.x} ${point.y}`
    } else if (annotation.coordinates.length === 2) {
      const [p1, p2] = annotation.coordinates
      pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
    } else {
      const [firstPoint, ...restPoints] = annotation.coordinates
      pathData = `M ${firstPoint.x} ${firstPoint.y}`

      // Use quadratic curves for smoother preview
      for (let i = 0; i < restPoints.length - 1; i++) {
        const current = restPoints[i]
        const next = restPoints[i + 1]
        const cpx = (current.x + next.x) / 2
        const cpy = (current.y + next.y) / 2
        pathData += ` Q ${current.x} ${current.y} ${cpx} ${cpy}`
      }
      // Add the last point
      const lastPoint = restPoints[restPoints.length - 1]
      pathData += ` T ${lastPoint.x} ${lastPoint.y}`
    }

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          d={pathData}
          style={{
            fill: "none",
            stroke: styles.stroke,
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeDasharray: "4 2", // Dotted line for temp annotation
          }}
        />
      </svg>
    )
  }

  return null
})
