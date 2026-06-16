import type { Annotation, Point } from "@/types/core"
import { useCanvasZoom, useCanvasTool } from "@/contexts/canvas-context"
import {
  AnnotationLabel,
  dashFor,
  strokeWidthFor,
  HANDLE_RADIUS,
} from "./annotation-styles"
import { useVertexDrag } from "@/hooks/use-vertex-drag"
import { memo, useCallback, useMemo } from "react"

interface LinestripAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}

// Open polyline through the annotation's vertices (LabelMe "linestrip").
export const LinestripAnnotation = memo(
  ({
    annotation,
    readOnly = false,
    isSelected = false,
    onUpdateAnnotation,
  }: LinestripAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()

    const isMoveTool = selectedTool === "move"

    // Live preview while dragging a vertex; commits once on release.
    const { previewCoordinates, startDrag } = useVertexDrag({
      annotationId: annotation.id,
      zoom,
      readOnly,
      onUpdateAnnotation,
    })
    const coordinates = previewCoordinates ?? annotation.coordinates

    const pointsString = useMemo(
      () => coordinates.map((p) => `${p.x},${p.y}`).join(" "),
      [coordinates]
    )

    const handlePointMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, index: number) => {
        startDrag(e, (next) =>
          annotation.coordinates.map((p, i) => (i === index ? next : p))
        )
      },
      [annotation.coordinates, startDrag]
    )

    const firstPoint = coordinates[0]
    if (!firstPoint) return null

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <polyline
          points={pointsString}
          style={{
            fill: "none",
            stroke: annotation.color,
            strokeWidth: strokeWidthFor(isSelected),
            strokeDasharray: dashFor(readOnly),
          }}
        />
        <AnnotationLabel
          x={firstPoint.x}
          y={firstPoint.y}
          color={annotation.color ?? "#3b82f6"}
          name={annotation.name}
          zoom={zoom}
        />
        {isMoveTool &&
          !readOnly &&
          coordinates.map((point: Point, index: number) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={HANDLE_RADIUS / zoom}
              className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto hover:fill-blue-200 transition-colors"
              onMouseDown={(e) => handlePointMouseDown(e, index)}
            />
          ))}
      </svg>
    )
  }
)

LinestripAnnotation.displayName = "LinestripAnnotation"
