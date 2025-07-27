import { useMemo } from "react"
import { motion } from "framer-motion"
import { rgbToRgba } from "@/lib/utils"
import type { Annotation, Point } from "@vailabel/core"
import { useCanvasStore } from "@/stores/canvas-store"

interface FreeDrawAnnotationProps {
  annotation: Annotation
  isTemporary?: boolean
}

export const FreeDrawAnnotation = ({
  annotation,
  isTemporary,
}: FreeDrawAnnotationProps) => {
  const { zoom, selectedTool, selectedAnnotation } = useCanvasStore()

  const isSelected = selectedAnnotation?.id === annotation.id

  const tempColor = "#2196f3"

  const styles = useMemo(
    () => ({
      fill: {
        selected: rgbToRgba(annotation.color ?? "#333", 0.3),
        default: "none", // No fill for free draw
        temp: "rgba(33,150,243,0.15)",
      },
      stroke: {
        selected: annotation.color ?? "#333",
        default: annotation.color ?? "#333",
        temp: tempColor,
      },
    }),
    [annotation.color]
  )

  // Create SVG path from coordinates with smooth curves
  const pathData = useMemo(() => {
    if (!annotation.coordinates || annotation.coordinates.length === 0) {
      return ""
    }

    if (annotation.coordinates.length === 1) {
      const point = annotation.coordinates[0]
      return `M ${point.x} ${point.y} L ${point.x} ${point.y}`
    }

    const [firstPoint, ...restPoints] = annotation.coordinates
    let path = `M ${firstPoint.x} ${firstPoint.y}`

    if (restPoints.length === 1) {
      // Simple line for two points
      path += ` L ${restPoints[0].x} ${restPoints[0].y}`
    } else {
      // Use quadratic curves for smoother lines
      for (let i = 0; i < restPoints.length - 1; i++) {
        const current = restPoints[i]
        const next = restPoints[i + 1]
        const cpx = (current.x + next.x) / 2
        const cpy = (current.y + next.y) / 2
        path += ` Q ${current.x} ${current.y} ${cpx} ${cpy}`
      }
      // Add the last point
      const lastPoint = restPoints[restPoints.length - 1]
      path += ` T ${lastPoint.x} ${lastPoint.y}`
    }

    return path
  }, [annotation.coordinates])

  if (!annotation.coordinates || annotation.coordinates.length === 0) {
    return null
  }

  return (
    <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        d={pathData}
        style={{
          fill: isTemporary
            ? styles.fill.temp
            : isSelected
              ? styles.fill.selected
              : styles.fill.default,
          stroke: isTemporary
            ? styles.stroke.temp
            : isSelected
              ? styles.stroke.selected
              : styles.stroke.default,
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />

      {/* Label */}
      {annotation.coordinates.length > 0 && (
        <text
          x={annotation.coordinates[0].x}
          y={annotation.coordinates[0].y - 10}
          style={{
            fill: isTemporary
              ? tempColor
              : isSelected
                ? styles.stroke.selected
                : styles.stroke.default,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          className="pointer-events-none"
        >
          {annotation.name}
        </text>
      )}

      {/* Show edit points when selected */}
      {isSelected && selectedTool === "move" && (
        <>
          {annotation.coordinates.map((point: Point, index: number) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4 / zoom}
              className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto"
            />
          ))}
        </>
      )}
    </svg>
  )
}

FreeDrawAnnotation.displayName = "FreeDrawAnnotation"
