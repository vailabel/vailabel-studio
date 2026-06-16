import { memo, useMemo } from "react"
import { useCanvasZoom, useCanvasTool } from "@/features/studio/canvas-state/canvas-context"
import {
  AnnotationLabel,
  dashFor,
  strokeWidthFor,
} from "./annotation-styles"
import { Annotation, Point } from "@/shared/types/core"

interface FreeDrawAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
}

export const FreeDrawAnnotation = memo(
  ({ annotation, readOnly = false, isSelected = false }: FreeDrawAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()

    const isMoveTool = selectedTool === "move"

    // Calculate bounding box for easier interaction
    const boundingBox = useMemo(() => {
      if (!annotation.coordinates || annotation.coordinates.length === 0) {
        return null
      }

      const xs = annotation.coordinates.map((p) => p.x)
      const ys = annotation.coordinates.map((p) => p.y)

      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      const padding = 8 // Extra padding around the shape

      return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      }
    }, [annotation.coordinates])

    // Memoize edit points to prevent recreation
    const editPoints = useMemo(() => {
      if (!isMoveTool || readOnly) return null

      const pointRadius = isSelected ? 6 / zoom : 4 / zoom
      const pointOpacity = isSelected ? 1 : 0.6

      return annotation.coordinates.map((point: Point, index: number) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={pointRadius}
          className="fill-card stroke-border stroke-2 cursor-pointer pointer-events-auto hover:fill-accent transition-colors"
          style={{ opacity: pointOpacity }}
        />
      ))
    }, [isMoveTool, isSelected, annotation.coordinates, zoom, readOnly])

    // Memoize bounding box for easier grabbing
    const boundingBoxElement = useMemo(() => {
      if (!isMoveTool || !boundingBox || readOnly) return null

      return (
        <rect
          x={boundingBox.x}
          y={boundingBox.y}
          width={boundingBox.width}
          height={boundingBox.height}
          fill={
            isSelected
              ? "color-mix(in oklch, var(--ring) 15%, transparent)"
              : "color-mix(in oklch, var(--ring) 5%, transparent)"
          }
          stroke={
            isSelected
              ? "color-mix(in oklch, var(--ring) 70%, transparent)"
              : "color-mix(in oklch, var(--ring) 30%, transparent)"
          }
          strokeWidth={isSelected ? 2 : 1}
          strokeDasharray="2 2"
          className="pointer-events-auto cursor-move hover:fill-accent hover:stroke-ring transition-all"
          style={{
            transition: "fill 0.2s ease, stroke 0.2s ease",
          }}
        />
      )
    }, [isMoveTool, isSelected, boundingBox, readOnly])

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
        {/* Bounding box for easier interaction */}
        {boundingBoxElement}

        <path
          d={pathData}
          vectorEffect="non-scaling-stroke"
          style={{
            fill: "none",
            stroke: annotation.color ?? "#333",
            strokeWidth: strokeWidthFor(isSelected),
            strokeDasharray: dashFor(readOnly),
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
          className={
            isMoveTool && !readOnly
              ? "pointer-events-auto cursor-move"
              : "pointer-events-none"
          }
        />

        <AnnotationLabel
          x={annotation.coordinates[0].x}
          y={annotation.coordinates[0].y}
          color={annotation.color ?? "#3b82f6"}
          name={annotation.name}
          zoom={zoom}
        />

        {/* Show edit points when selected */}
        {editPoints}
      </svg>
    )
  }
)

FreeDrawAnnotation.displayName = "FreeDrawAnnotation"

