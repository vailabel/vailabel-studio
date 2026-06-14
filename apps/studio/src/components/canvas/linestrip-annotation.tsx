import { rgbToRgba } from "../../lib/utils"
import type { Annotation, Point } from "@/types/core"
import {
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import { memo, useCallback, useMemo } from "react"

interface LinestripAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}

// Open polyline through the annotation's vertices (LabelMe "linestrip").
export const LinestripAnnotation = memo(
  ({ annotation, readOnly = false, onUpdateAnnotation }: LinestripAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const { selectedAnnotation } = useCanvasSelection()

    const isSelected = selectedAnnotation?.id === annotation.id
    const isMoveTool = selectedTool === "move"

    const pointsString = useMemo(
      () => annotation.coordinates.map((p) => `${p.x},${p.y}`).join(" "),
      [annotation.coordinates]
    )

    const handlePointMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, index: number) => {
        e.stopPropagation()
        const svg = (e.target as SVGCircleElement).ownerSVGElement
        if (!svg) return
        const rect = svg.getBoundingClientRect()

        function onMouseMove(moveEvent: MouseEvent) {
          if (readOnly || !onUpdateAnnotation) return
          const newX = (moveEvent.clientX - rect.left) / zoom
          const newY = (moveEvent.clientY - rect.top) / zoom
          const newCoordinates = annotation.coordinates.map((p, i) =>
            i === index ? { x: newX, y: newY } : p
          )
          void onUpdateAnnotation(annotation.id, {
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
      [annotation.coordinates, annotation.id, onUpdateAnnotation, readOnly, zoom]
    )

    const firstPoint = annotation.coordinates[0]
    if (!firstPoint) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <polyline
          points={pointsString}
          style={{
            fill: "none",
            stroke: isSelected ? "#ef4444" : annotation.color,
            strokeWidth: isSelected ? 3 : 2,
            strokeDasharray: readOnly ? "6 4" : "none",
          }}
        />
        <text
          x={firstPoint.x}
          y={firstPoint.y - 10}
          style={{ fill: rgbToRgba(annotation.color, 1) }}
          className="text-xs"
        >
          {annotation.name}
        </text>
        {isMoveTool &&
          !readOnly &&
          annotation.coordinates.map((point: Point, index: number) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4 / zoom}
              className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto hover:fill-blue-200 transition-colors"
              onMouseDown={(e) => handlePointMouseDown(e, index)}
            />
          ))}
      </svg>
    )
  }
)

LinestripAnnotation.displayName = "LinestripAnnotation"
