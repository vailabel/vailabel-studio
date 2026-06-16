import type { Annotation } from "@/shared/types/core"
import { useCanvasZoom, useCanvasTool } from "@/features/studio/canvas-state/canvas-context"
import {
  AnnotationLabel,
  dashFor,
  strokeWidthFor,
  HANDLE_RADIUS,
} from "./annotation-styles"
import { useVertexDrag } from "@/features/studio/canvas-state/use-vertex-drag"
import { memo, useCallback } from "react"

interface LineAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<unknown>
}

export const LineAnnotation = memo(
  ({
    annotation,
    readOnly = false,
    isSelected = false,
    onUpdateAnnotation,
  }: LineAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()

    const isMoveTool = selectedTool === "move"

    // Live preview while dragging an endpoint; commits once on release.
    const { previewCoordinates, startDrag } = useVertexDrag({
      annotationId: annotation.id,
      zoom,
      readOnly,
      onUpdateAnnotation,
    })
    const coordinates = previewCoordinates ?? annotation.coordinates

    const start = coordinates[0]
    const end = coordinates[1]

    const handlePointMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, index: number) => {
        startDrag(e, (next) =>
          annotation.coordinates.map((p, i) => (i === index ? next : p))
        )
      },
      [annotation.coordinates, startDrag]
    )

    if (!start || !end) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          vectorEffect="non-scaling-stroke"
          style={{
            stroke: annotation.color,
            strokeWidth: strokeWidthFor(isSelected),
            strokeDasharray: dashFor(readOnly),
          }}
        />
        <AnnotationLabel
          x={start.x}
          y={start.y}
          color={annotation.color ?? "#3b82f6"}
          name={annotation.name}
          zoom={zoom}
        />
        {isMoveTool &&
          !readOnly &&
          coordinates.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={HANDLE_RADIUS / zoom}
              className="fill-card stroke-border stroke-1 cursor-pointer pointer-events-auto hover:fill-accent transition-colors"
              onMouseDown={(e) => handlePointMouseDown(e, index)}
            />
          ))}
      </svg>
    )
  }
)

LineAnnotation.displayName = "LineAnnotation"
