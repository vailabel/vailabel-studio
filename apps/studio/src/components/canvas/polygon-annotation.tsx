import { motion } from "framer-motion"
import { rgbToRgba } from "../../lib/utils"
import type { Annotation, Point } from "@vailabel/core"
import {
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import { memo, useMemo, useCallback } from "react"

interface PolygonAnnotationProps {
  annotation: Annotation
}

export const PolygonAnnotation = memo(
  ({ annotation }: Readonly<PolygonAnnotationProps>) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const { selectedAnnotation } = useCanvasSelection()

    const isSelected = selectedAnnotation?.id === annotation.id
    const isAIGenerated = annotation.isAIGenerated
    const isMoveTool = selectedTool === "move"

    // Memoize styles to prevent recalculation
    const styles = useMemo(
      () => ({
        fill: {
          selected: rgbToRgba(annotation.color, 0.2),
          aiGenerated: rgbToRgba(annotation.color, 0.2),
          default: rgbToRgba(annotation.color, 0.2),
        },
        stroke: {
          selected: annotation.color,
          aiGenerated: annotation.color,
          default: annotation.color,
        },
        strokeWidth: {
          selected: 2,
          aiGenerated: 2,
          default: 2,
        },
        strokeDashArray: {
          selected: "none",
          aiGenerated: "none",
          default: "none",
        },
        textFill: {
          selected: annotation.color,
          aiGenerated: annotation.color,
          default: annotation.color,
        },
      }),
      [annotation.color]
    )

    // Memoize polygon points string to avoid recalculation
    const pointsString = useMemo(
      () => annotation.coordinates.map((p) => `${p.x},${p.y}`).join(" "),
      [annotation.coordinates]
    )

    // Helper to handle point drag
    const handlePointMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, index: number) => {
        e.stopPropagation()
        const svg = (e.target as SVGCircleElement).ownerSVGElement
        if (!svg) return
        const rect = svg.getBoundingClientRect()

        function onMouseMove(moveEvent: MouseEvent) {
          const newX = (moveEvent.clientX - rect.left) / zoom
          const newY = (moveEvent.clientY - rect.top) / zoom
          const newCoordinates = annotation.coordinates.map((p, i) =>
            i === index ? { x: newX, y: newY } : p
          )
          services.getAnnotationService().updateAnnotation(annotation.id, {
            coordinates: newCoordinates,
            updatedAt: new Date(),
          })
        }
        function onMouseUp() {
          window.removeEventListener("mousemove", onMouseMove)
          window.removeEventListener("mouseup", onMouseUp)
        }
        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", onMouseUp)
      },
      [annotation.coordinates, annotation.id, zoom]
    )

    // Memoize edit points to prevent recreation
    const editPoints = useMemo(() => {
      if (!isMoveTool) return null

      const pointRadius = isSelected ? 4 / zoom : 3 / zoom
      const pointOpacity = isSelected ? 1 : 0.6

      return annotation.coordinates.map((point: Point, index: number) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={pointRadius}
          className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto hover:fill-blue-200 transition-colors"
          style={{ opacity: pointOpacity }}
          onMouseDown={(e) => handlePointMouseDown(e, index)}
        />
      ))
    }, [
      isMoveTool,
      isSelected,
      annotation.coordinates,
      zoom,
      handlePointMouseDown,
    ])

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          points={pointsString}
          style={{
            fill: isSelected
              ? styles.fill.selected
              : isAIGenerated
                ? styles.fill.aiGenerated
                : styles.fill.default,
            stroke: isSelected
              ? styles.stroke.selected
              : isAIGenerated
                ? styles.stroke.aiGenerated
                : styles.stroke.default,
            strokeWidth: isSelected
              ? styles.strokeWidth.selected + 1 // Thicker when selected
              : isMoveTool
                ? styles.strokeWidth.default + 0.5 // Slightly thicker when move tool is active
                : isAIGenerated
                  ? styles.strokeWidth.aiGenerated
                  : styles.strokeWidth.default,
            strokeDasharray: isSelected
              ? styles.strokeDashArray.selected
              : isAIGenerated
                ? styles.strokeDashArray.aiGenerated
                : styles.strokeDashArray.default,
          }}
          className={
            isMoveTool
              ? "pointer-events-auto cursor-move"
              : "pointer-events-none"
          }
        />
        <text
          x={annotation.coordinates[0].x}
          y={annotation.coordinates[0].y - 10}
          style={{
            fill: isSelected
              ? styles.textFill.selected
              : isAIGenerated
                ? styles.textFill.aiGenerated
                : styles.textFill.default,
          }}
          className="text-xs"
        >
          {annotation.name}
        </text>

        {editPoints}
      </svg>
    )
  }
)
