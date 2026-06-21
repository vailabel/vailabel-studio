import { memo, useMemo } from "react"
import type { Annotation } from "@/shared/types/core"
import { useCanvasZoom, useCanvasTool } from "@/features/studio/canvas-state/canvas-context"
import {
  AnnotationLabel,
  DimensionBadge,
  dashFor,
  fillFor,
  strokeWidthFor,
  HANDLE_RADIUS,
} from "./annotation-styles"

interface BoxAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
}

// Rendered as SVG (like every other shape) so the outline and class-name badge
// stay crisp at any zoom: the stroke is non-scaling (a constant ~2px on screen
// instead of `2 * zoom`, which collapses to a hairline at fit-zoom) and the
// label is drawn through the shared `AnnotationLabel`, which counter-scales by
// 1/zoom. The previous div-based box scaled its border and 12px label with the
// canvas, so at fit-zoom both turned tiny and blurry.
export const BoxAnnotation = memo(
  ({ annotation, readOnly = false, isSelected = false }: BoxAnnotationProps) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const isMoveTool = selectedTool === "move"

    // Normalize to a top-left origin + positive size so the rect is valid even
    // if the box was dragged bottom-right → top-left.
    const rect = useMemo(() => {
      const c0 = annotation.coordinates[0]
      const c1 = annotation.coordinates[1] ?? c0
      if (!c0) return null
      return {
        x: Math.min(c0.x, c1.x),
        y: Math.min(c0.y, c1.y),
        width: Math.abs(c1.x - c0.x),
        height: Math.abs(c1.y - c0.y),
      }
    }, [annotation.coordinates])

    // Corner + edge handles, drawn at a constant ~10px on screen (size / zoom).
    // Shown only on the SELECTED box (move tool) — like Figma/CVAT — so the move
    // tool isn't cluttered with faint handles on every shape. Purely visual:
    // resize hit-testing happens in image space in the tool handler.
    const handles = useMemo(() => {
      if (!rect || !isMoveTool || readOnly || !isSelected) return null
      const size = (HANDLE_RADIUS * 2) / zoom
      const half = size / 2
      const { x, y, width, height } = rect
      const midX = x + width / 2
      const midY = y + height / 2
      const points = [
        { x, y, cursor: "cursor-nwse-resize" },
        { x: x + width, y, cursor: "cursor-nesw-resize" },
        { x, y: y + height, cursor: "cursor-nesw-resize" },
        { x: x + width, y: y + height, cursor: "cursor-nwse-resize" },
        { x: midX, y, cursor: "cursor-ns-resize" },
        { x: midX, y: y + height, cursor: "cursor-ns-resize" },
        { x, y: midY, cursor: "cursor-ew-resize" },
        { x: x + width, y: midY, cursor: "cursor-ew-resize" },
      ]
      return points.map((p, i) => (
        <rect
          key={i}
          x={p.x - half}
          y={p.y - half}
          width={size}
          height={size}
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 1 }}
          className={`fill-card stroke-border pointer-events-auto ${p.cursor} opacity-100`}
        />
      ))
    }, [rect, isMoveTool, readOnly, zoom, isSelected])

    if (!rect) return null

    const color = annotation.color ?? "#3b82f6"

    return (
      <svg
        data-testid="box-annotation"
        className="absolute left-0 top-0 h-full w-full pointer-events-none"
        style={{ overflow: "visible" }}
      >
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          vectorEffect="non-scaling-stroke"
          style={{
            fill: fillFor(color, isSelected),
            stroke: color,
            strokeWidth: strokeWidthFor(isSelected),
            strokeDasharray: dashFor(readOnly),
          }}
          className={
            isMoveTool && !readOnly
              ? "pointer-events-auto cursor-move"
              : "pointer-events-none"
          }
        />
        <AnnotationLabel
          x={rect.x}
          y={rect.y}
          color={color}
          name={annotation.name}
          zoom={zoom}
        />
        {/* Live W×H on the selected box — updates as it's resized/moved (the box
            renders with preview coordinates during those operations). */}
        {isSelected && !readOnly ? (
          <DimensionBadge
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            zoom={zoom}
          />
        ) : null}
        {handles}
      </svg>
    )
  }
)

BoxAnnotation.displayName = "BoxAnnotation"
