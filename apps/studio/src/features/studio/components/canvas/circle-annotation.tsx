import type { Annotation } from "@/shared/types/core"
import { useCanvasZoom, useCanvasTool } from "@/features/studio/canvas-state/canvas-context"
import {
  AnnotationLabel,
  dashFor,
  fillFor,
  strokeWidthFor,
  HANDLE_RADIUS,
} from "./annotation-styles"
import { useVertexDrag } from "@/features/studio/canvas-state/use-vertex-drag"
import { memo, useCallback } from "react"

interface CircleAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<unknown>
}

export const CircleAnnotation = memo(
  ({
    annotation,
    readOnly = false,
    isSelected = false,
    onUpdateAnnotation,
  }: CircleAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()

    const isMoveTool = selectedTool === "move"

    // Live preview while dragging the radius handle; commits once on release.
    const { previewCoordinates, startDrag } = useVertexDrag({
      annotationId: annotation.id,
      zoom,
      readOnly,
      onUpdateAnnotation,
    })
    const coordinates = previewCoordinates ?? annotation.coordinates

    const center = coordinates[0]
    const edge = coordinates[1] || center
    const radius = center ? Math.hypot(edge.x - center.x, edge.y - center.y) : 0

    const handleEdgeMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>) => {
        startDrag(e, (next) => [annotation.coordinates[0], next])
      },
      [annotation.coordinates, startDrag]
    )

    if (!center) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          vectorEffect="non-scaling-stroke"
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
            className="fill-card stroke-border stroke-1 cursor-pointer pointer-events-auto hover:fill-accent transition-colors"
            onMouseDown={handleEdgeMouseDown}
          />
        )}
      </svg>
    )
  }
)

CircleAnnotation.displayName = "CircleAnnotation"
