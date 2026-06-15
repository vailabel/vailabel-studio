import type { Annotation } from "@/types/core"
import {
  useCanvasZoom,
  useCanvasTool,
  useCanvasSelection,
} from "@/contexts/canvas-context"
import {
  AnnotationLabel,
  dashFor,
  fillFor,
  strokeWidthFor,
  HANDLE_RADIUS,
} from "./annotation-styles"
import { memo, useCallback } from "react"

interface CircleAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}

export const CircleAnnotation = memo(
  ({ annotation, readOnly = false, onUpdateAnnotation }: CircleAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const { selectedAnnotation } = useCanvasSelection()

    const isSelected = selectedAnnotation?.id === annotation.id
    const isMoveTool = selectedTool === "move"

    const center = annotation.coordinates[0]
    const edge = annotation.coordinates[1] || center
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y)

    const handleEdgeMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>) => {
        e.stopPropagation()
        const svg = (e.target as SVGCircleElement).ownerSVGElement
        if (!svg) return
        const rect = svg.getBoundingClientRect()

        function onMouseMove(moveEvent: MouseEvent) {
          if (readOnly || !onUpdateAnnotation) return
          const newX = (moveEvent.clientX - rect.left) / zoom
          const newY = (moveEvent.clientY - rect.top) / zoom
          void onUpdateAnnotation(annotation.id, {
            coordinates: [center, { x: newX, y: newY }],
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
      [annotation.id, center, onUpdateAnnotation, readOnly, zoom]
    )

    if (!center) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          style={{
            fill: fillFor(annotation.color, isSelected),
            stroke: annotation.color,
            strokeWidth: strokeWidthFor(isSelected),
            strokeDasharray: dashFor(readOnly),
          }}
        />
        <AnnotationLabel
          x={center.x - radius}
          y={center.y - radius}
          color={annotation.color ?? "#3b82f6"}
          name={annotation.name}
          zoom={zoom}
        />
        {isMoveTool && !readOnly && (
          <circle
            cx={edge.x}
            cy={edge.y}
            r={HANDLE_RADIUS / zoom}
            className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto hover:fill-blue-200 transition-colors"
            onMouseDown={handleEdgeMouseDown}
          />
        )}
      </svg>
    )
  }
)

CircleAnnotation.displayName = "CircleAnnotation"
