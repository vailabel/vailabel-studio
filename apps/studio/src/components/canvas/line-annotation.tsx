import type { Annotation } from "@/types/core"
import {
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import { memo, useCallback } from "react"

interface LineAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}

export const LineAnnotation = memo(
  ({ annotation, readOnly = false, onUpdateAnnotation }: LineAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const { selectedAnnotation } = useCanvasSelection()

    const isSelected = selectedAnnotation?.id === annotation.id
    const isMoveTool = selectedTool === "move"

    const start = annotation.coordinates[0]
    const end = annotation.coordinates[1]

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

    if (!start || !end) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          style={{
            stroke: isSelected ? "#ef4444" : annotation.color,
            strokeWidth: isSelected ? 3 : 2,
            strokeDasharray: readOnly ? "6 4" : "none",
          }}
          className="animate-in fade-in duration-200"
        />
        <text
          x={start.x}
          y={start.y - 8}
          style={{ fill: annotation.color }}
          className="text-xs"
        >
          {annotation.name}
        </text>
        {isMoveTool &&
          !readOnly &&
          annotation.coordinates.map((point, index) => (
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

LineAnnotation.displayName = "LineAnnotation"
