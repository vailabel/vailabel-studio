import type { Annotation } from "@/types/core"
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
          <polygon
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
          <circle
            key={`vertex-${index}`}
            style={{
              fill: styles.vertexFill,
              stroke: styles.vertexStroke,
              strokeWidth: 1.5,
              animationDelay: `${index * 100}ms`,
            }}
            cx={point.x}
            cy={point.y}
            r={4}
          />
        ))}

        {/* Close indicator - show green circle on first point when near */}
        {coordinates.length >= 3 && (
          <circle
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
          <text
            key={`label-${index}`}
            x={point.x + 8}
            y={point.y - 8}
            style={{
              fill: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              animationDelay: `${index * 100}ms`,
            }}
          >
            {index + 1}
          </text>
        ))}
      </svg>
    )
  }
)

TempPolygonAnnotation.displayName = "TempPolygonAnnotation"

