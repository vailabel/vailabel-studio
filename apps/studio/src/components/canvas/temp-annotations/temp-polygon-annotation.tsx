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
      vertexFill: 'rgba(59, 130, 246)',
      vertexStroke: 'white',
      closeFill: 'rgba(34, 197, 94, 0.8)', // Green for close indicator
      closeStroke: 'white',
    }

    const coordinates = annotation.coordinates
    const hasMultiplePoints = coordinates.length > 1

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        {/* Main polygon */}
        {hasMultiplePoints && (
          <motion.polygon
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            points={coordinates.map((p) => `${p.x},${p.y}`).join(" ")}
            style={{
              fill: styles.fill,
              stroke: styles.stroke,
              strokeWidth: 2,
              strokeDasharray: "4 2", // Dotted line
            }}
          />
        )}

        {/* Vertex points */}
        {coordinates.map((point, index) => (
          <motion.circle
            key={`vertex-${index}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            cx={point.x}
            cy={point.y}
            r={4}
            style={{
              fill: styles.vertexFill,
              stroke: styles.vertexStroke,
              strokeWidth: 1.5,
            }}
          />
        ))}

        {/* Close indicator - show green circle on first point when near */}
        {coordinates.length >= 3 && (
          <motion.circle
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            cx={coordinates[0].x}
            cy={coordinates[0].y}
            r={8}
            style={{
              fill: styles.closeFill,
              stroke: styles.closeStroke,
              strokeWidth: 2,
            }}
          />
        )}

        {/* Point numbers for better UX */}
        {coordinates.map((point, index) => (
          <motion.text
            key={`label-${index}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            x={point.x + 8}
            y={point.y - 8}
            style={{
              fill: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
            }}
          >
            {index + 1}
          </motion.text>
        ))}
      </svg>
    )
  }
)

TempPolygonAnnotation.displayName = "TempPolygonAnnotation"
