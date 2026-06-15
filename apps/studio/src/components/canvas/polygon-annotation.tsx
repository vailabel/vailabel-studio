import type { Annotation, Point } from "@/types/core"
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
} from "./annotation-styles"
import { memo, useMemo, useCallback } from "react"

interface PolygonAnnotationProps {
  annotation: Annotation
  readOnly?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}

export const PolygonAnnotation = memo(
  ({
    annotation,
    readOnly = false,
    onUpdateAnnotation,
  }: Readonly<PolygonAnnotationProps>) => {
    const { zoom } = useCanvasZoom()
    const { selectedTool } = useCanvasTool()
    const { selectedAnnotation } = useCanvasSelection()

    const isSelected = selectedAnnotation?.id === annotation.id
    const isMoveTool = selectedTool === "move"

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

      return annotation.coordinates.map((point: Point, index: number) => (
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
      annotation.coordinates,
      zoom,
      handlePointMouseDown,
      handleDeleteVertex,
    ])

    // Midpoint "add vertex" handles, one per edge (including the closing edge).
    const addVertexHandles = useMemo(() => {
      if (!isMoveTool || readOnly || !isSelected) return null

      return annotation.coordinates.map((point: Point, index: number) => {
        const next =
          annotation.coordinates[(index + 1) % annotation.coordinates.length]
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
      annotation.coordinates,
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
          x={annotation.coordinates[0].x}
          y={annotation.coordinates[0].y}
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

