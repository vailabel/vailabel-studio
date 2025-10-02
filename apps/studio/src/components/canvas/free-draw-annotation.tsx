import { memo, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import {
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import { Annotation, Point } from "@vailabel/core"

interface FreeDrawAnnotationProps {
  annotation: Annotation
}

export const FreeDrawAnnotation = memo(
  ({ annotation }: FreeDrawAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const { selection } = useCanvasSelection()
    const selectedAnnotation = selection

    const isSelected = selectedAnnotation?.id === annotation.id
    const isMoveTool = selectedTool === "move"

    const styles = useMemo(
      () => ({
        fill: {
          selected: "none", // No fill for free draw
          default: "none", // No fill for free draw
        },
        stroke: {
          selected: annotation.color ?? "#333",
          default: annotation.color ?? "#333",
        },
        strokeWidth: {
          selected: 2,
          default: 2,
        },
        strokeDashArray: {
          selected: "none",
          default: "none",
        },
      }),
      [annotation.color]
    )

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

    // Calculate center point for easier dragging
    const centerPoint = useMemo(() => {
      if (!annotation.coordinates || annotation.coordinates.length === 0) {
        return null
      }

      const xs = annotation.coordinates.map((p) => p.x)
      const ys = annotation.coordinates.map((p) => p.y)

      return {
        x: xs.reduce((sum, x) => sum + x, 0) / xs.length,
        y: ys.reduce((sum, y) => sum + y, 0) / ys.length,
      }
    }, [annotation.coordinates])

    // Memoize edit points to prevent recreation
    const editPoints = useMemo(() => {
      if (!isMoveTool) return null

      const pointRadius = isSelected ? 6 / zoom : 4 / zoom
      const pointOpacity = isSelected ? 1 : 0.6

      return annotation.coordinates.map((point: Point, index: number) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={pointRadius}
          className="fill-white stroke-gray-400 stroke-2 cursor-pointer pointer-events-auto hover:fill-blue-200 transition-colors"
          style={{ opacity: pointOpacity }}
        />
      ))
    }, [isMoveTool, isSelected, annotation.coordinates, zoom])

    // Memoize bounding box for easier grabbing
    const boundingBoxElement = useMemo(() => {
      if (!isMoveTool || !boundingBox) return null

      return (
        <rect
          x={boundingBox.x}
          y={boundingBox.y}
          width={boundingBox.width}
          height={boundingBox.height}
          fill={
            isSelected ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.05)"
          }
          stroke={
            isSelected ? "rgba(59, 130, 246, 0.7)" : "rgba(59, 130, 246, 0.3)"
          }
          strokeWidth={isSelected ? 2 : 1}
          strokeDasharray="2 2"
          className="pointer-events-auto cursor-move hover:fill-blue-200 hover:stroke-blue-500 transition-all"
          style={{
            transition: "fill 0.2s ease, stroke 0.2s ease",
          }}
        />
      )
    }, [isMoveTool, isSelected, boundingBox])

    // Helper to handle center point drag
    const handleCenterPointMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>) => {
        e.stopPropagation()
        const svg = (e.target as SVGCircleElement).ownerSVGElement
        if (!svg) return
        const rect = svg.getBoundingClientRect()

        function onMouseMove(moveEvent: MouseEvent) {
          const newX = (moveEvent.clientX - rect.left) / zoom
          const newY = (moveEvent.clientY - rect.top) / zoom

          // Calculate the offset from the original center
          const offsetX = newX - centerPoint!.x
          const offsetY = newY - centerPoint!.y

          // Move all points by the same offset
          const newCoordinates = annotation.coordinates.map((point) => ({
            x: point.x + offsetX,
            y: point.y + offsetY,
          }))

          // TODO: Update annotation coordinates
          console.log("Update annotation:", annotation.id, newCoordinates)
        }

        function onMouseUp() {
          window.removeEventListener("mousemove", onMouseMove)
          window.removeEventListener("mouseup", onMouseUp)
        }

        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", onMouseUp)
      },
      [zoom, centerPoint, annotation.coordinates, annotation.id]
    )

    // Memoize center point for easy dragging
    const centerPointElement = useMemo(() => {
      if (!isMoveTool || !centerPoint) return null

      const centerRadius = isSelected ? 8 / zoom : 6 / zoom
      const centerOpacity = isSelected ? 1 : 0.7

      return (
        <circle
          cx={centerPoint.x}
          cy={centerPoint.y}
          r={centerRadius}
          fill="rgba(59, 130, 246, 0.8)"
          stroke="white"
          strokeWidth={2}
          className="pointer-events-auto cursor-move hover:fill-blue-500 transition-colors"
          style={{
            opacity: centerOpacity,
            transition: "fill 0.2s ease, opacity 0.2s ease",
          }}
          onMouseDown={handleCenterPointMouseDown}
        />
      )
    }, [isMoveTool, isSelected, centerPoint, zoom, handleCenterPointMouseDown])

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

        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          d={pathData}
          style={{
            fill: isSelected ? styles.fill.selected : styles.fill.default,
            stroke: isSelected ? styles.stroke.selected : styles.stroke.default,
            strokeWidth: isSelected
              ? styles.strokeWidth.selected + 2 // Thicker stroke when selected for easier clicking
              : isMoveTool
                ? styles.strokeWidth.default + 1 // Slightly thicker when move tool is active
                : styles.strokeWidth.default,
            strokeDasharray: isSelected
              ? styles.strokeDashArray.selected
              : styles.strokeDashArray.default,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
          className={
            isMoveTool
              ? "pointer-events-auto cursor-move"
              : "pointer-events-none"
          }
        />

        {/* Label */}
        {annotation.coordinates.length > 0 && (
          <text
            x={annotation.coordinates[0].x}
            y={annotation.coordinates[0].y - 10}
            style={{
              fill: isSelected ? styles.stroke.selected : styles.stroke.default,
              fontSize: "12px",
              fontWeight: "bold",
            }}
            className="pointer-events-none"
          >
            {annotation.name}
          </text>
        )}

        {/* Show edit points when selected */}
        {editPoints}

        {/* Center point for easy dragging */}
        {centerPointElement}
      </svg>
    )
  }
)

FreeDrawAnnotation.displayName = "FreeDrawAnnotation"
