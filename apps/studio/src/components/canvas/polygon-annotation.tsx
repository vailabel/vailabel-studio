import type { Annotation, Point } from "@/types/core"
import { useCanvasZoom, useCanvasTool } from "@/contexts/canvas-context"
import {
  AnnotationLabel,
  dashFor,
  fillFor,
  strokeWidthFor,
} from "./annotation-styles"
import { useVertexDrag } from "@/hooks/use-vertex-drag"
import { memo, useMemo, useCallback } from "react"

interface PolygonAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  isSelected?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}

export const PolygonAnnotation = memo(
  ({
    annotation,
    readOnly = false,
    isSelected = false,
    onUpdateAnnotation,
  }: Readonly<PolygonAnnotationProps>) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()

    const isMoveTool = selectedTool === "move"

    // While a vertex is being dragged, render from the live preview; it commits
    // once on mouse-up (see useVertexDrag) instead of saving on every frame.
    const { previewCoordinates, startDrag } = useVertexDrag({
      annotationId: annotation.id,
      zoom,
      readOnly,
      onUpdateAnnotation,
    })
    const coordinates = previewCoordinates ?? annotation.coordinates
    const isDragging = previewCoordinates !== null

    // Memoize polygon points string to avoid recalculation
    const pointsString = useMemo(
      () => coordinates.map((p) => `${p.x},${p.y}`).join(" "),
      [coordinates]
    )

    // Drag a single vertex (live preview, single commit on release).
    const handlePointMouseDown = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, index: number) => {
        startDrag(e, (next) =>
          annotation.coordinates.map((p, i) => (i === index ? next : p))
        )
      },
      [annotation.coordinates, startDrag]
    )

    // Delete a vertex (right-click / alt-click). Keeps a valid polygon (>= 3).
    const handleDeleteVertex = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, index: number) => {
        e.preventDefault()
        e.stopPropagation()
        if (readOnly || !onUpdateAnnotation) return
        if (annotation.coordinates.length <= 3) return
        const newCoordinates = annotation.coordinates.filter(
          (_, i) => i !== index
        )
        void onUpdateAnnotation(annotation.id, {
          coordinates: newCoordinates,
          updatedAt: new Date(),
        })
      },
      [annotation.coordinates, annotation.id, onUpdateAnnotation, readOnly]
    )

    // Add a vertex by clicking the midpoint handle of an edge.
    const handleAddVertex = useCallback(
      (e: React.MouseEvent<SVGCircleElement>, afterIndex: number) => {
        e.stopPropagation()
        if (readOnly || !onUpdateAnnotation) return
        const a = annotation.coordinates[afterIndex]
        const b =
          annotation.coordinates[
            (afterIndex + 1) % annotation.coordinates.length
          ]
        const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const newCoordinates = [...annotation.coordinates]
        newCoordinates.splice(afterIndex + 1, 0, midpoint)
        void onUpdateAnnotation(annotation.id, {
          coordinates: newCoordinates,
          updatedAt: new Date(),
        })
      },
      [annotation.coordinates, annotation.id, onUpdateAnnotation, readOnly]
    )

    // Memoize edit points to prevent recreation
    const editPoints = useMemo(() => {
      if (!isMoveTool || readOnly) return null

      const pointRadius = isSelected ? 4 / zoom : 3 / zoom
      const pointOpacity = isSelected ? 1 : 0.6

      return coordinates.map((point: Point, index: number) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={pointRadius}
          className="fill-white stroke-gray-400 stroke-1 cursor-pointer pointer-events-auto hover:fill-blue-200 transition-colors"
          style={{ opacity: pointOpacity }}
          onMouseDown={(e) =>
            e.altKey
              ? handleDeleteVertex(e, index)
              : handlePointMouseDown(e, index)
          }
          onContextMenu={(e) => handleDeleteVertex(e, index)}
        />
      ))
    }, [
      isMoveTool,
      isSelected,
      readOnly,
      coordinates,
      zoom,
      handlePointMouseDown,
      handleDeleteVertex,
    ])

    // Midpoint "add vertex" handles, one per edge (including the closing edge).
    // Hidden while dragging a vertex so dense (SAM) polygons don't reconcile two
    // handles per vertex every frame.
    const addVertexHandles = useMemo(() => {
      if (!isMoveTool || readOnly || !isSelected || isDragging) return null

      return coordinates.map((point: Point, index: number) => {
        const next = coordinates[(index + 1) % coordinates.length]
        const mid = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
        return (
          <circle
            key={`add-${index}`}
            cx={mid.x}
            cy={mid.y}
            r={3 / zoom}
            className="fill-green-400/70 stroke-white stroke-1 cursor-copy pointer-events-auto hover:fill-green-400 transition-colors"
            onMouseDown={(e) => handleAddVertex(e, index)}
          />
        )
      })
    }, [
      isMoveTool,
      isSelected,
      readOnly,
      isDragging,
      coordinates,
      zoom,
      handleAddVertex,
    ])

    return (
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        <polygon
          points={pointsString}
          style={{
            fill: fillFor(annotation.color, isSelected),
            stroke: annotation.color,
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
          x={coordinates[0].x}
          y={coordinates[0].y}
          color={annotation.color ?? "#3b82f6"}
          name={annotation.name}
          zoom={zoom}
        />

        {addVertexHandles}
        {editPoints}
      </svg>
    )
  }
)

