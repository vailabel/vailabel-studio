import type { Point, Annotation } from "@/shared/types/core"
import { ToolHandlerContext } from "./tool-handler-context"
import { ToolHandler } from "../tool-handlers"
import { dedupeConsecutivePoints } from "../canvas-utils"

export type PolygonHandlerUIState = {
  polygonPoints?: Point[]
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

export class PolygonHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    const { toolState } = this.context

    // Handle right-click for undo
    if (e.button === 2) { // Right click
      if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
        const newPoints = toolState.polygonPoints.slice(0, -1)
        this.context.setToolState({
          polygonPoints: newPoints,
          isDrawing: newPoints.length > 0,
          tempAnnotation: newPoints.length > 0 ? {
            type: "polygon",
            coordinates: newPoints,
            imageId: this.context.annotationsStore.currentImage?.id || "",
          } : null,
        })
      }
      return
    }

    if (e.button !== 0) return // Only handle left clicks

    // Check if we're clicking near the first point to close the polygon.
    // The snap radius is defined in SCREEN pixels and converted to image space
    // via zoom, so closing is equally easy whether zoomed in or out.
    if (toolState.polygonPoints && toolState.polygonPoints.length >= 3) {
      const firstPoint = toolState.polygonPoints[0]
      const dx = point.x - firstPoint.x
      const dy = point.y - firstPoint.y
      const distanceSquared = dx * dx + dy * dy

      const snapRadius = 14 / (this.context.zoom || 1)
      if (distanceSquared <= snapRadius * snapRadius) {
        this.finishPolygon()
        return
      }
    }

    // Add new point to the polygon
    const newPoints = toolState.polygonPoints
      ? [...toolState.polygonPoints, point]
      : [point]

    this.context.setToolState({
      polygonPoints: newPoints,
      // Mark drawing active so the canvas dispatcher keeps forwarding mousemove
      // events — that's what renders the rubber-band preview line to the cursor.
      isDrawing: true,
      tempAnnotation: {
        type: "polygon",
        coordinates: newPoints,
        imageId: this.context.annotationsStore.currentImage?.id || "",
      },
    })
  }

  onMouseMove(_e: React.MouseEvent, point: Point) {
    const { toolState } = this.context

    // Show preview line from last point to current mouse position
    if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
      const previewPoints = [...toolState.polygonPoints, point]

      this.context.setToolState({
        tempAnnotation: {
          type: "polygon",
          coordinates: previewPoints,
          imageId: this.context.annotationsStore.currentImage?.id || "",
        },
      })
    }
  }

  onMouseUp() {
    // Polygon tool doesn't need specific mouse up handling
  }

  onDoubleClick() {
    this.finishPolygon()
  }

  private finishPolygon() {
    const { toolState } = this.context
    // Drop near-duplicate trailing vertices (a double-click fires two mousedowns
    // before the dblclick, each adding a point) so finishing never leaves cruft.
    const points = dedupeConsecutivePoints(
      toolState.polygonPoints || [],
      3 / (this.context.zoom || 1)
    )
    if (points.length >= 3) {
      this.context.setToolState({
        showLabelInput: true,
        isDrawing: false,
        polygonPoints: points,
        tempAnnotation: {
          type: "polygon",
          coordinates: points,
          imageId: this.context.annotationsStore.currentImage?.id || "",
        },
      })
    }
  }

  // Method to clear polygon state (called after annotation is saved)
  clearState() {
    this.context.setToolState({
      polygonPoints: [],
      isDrawing: false,
      tempAnnotation: null,
      showLabelInput: false,
    })
  }

  // Handle keyboard shortcuts for better UX
  onKeyDown(e: KeyboardEvent) {
    const { toolState } = this.context
    
    if (e.key === "Escape") {
      // Cancel current polygon
      this.context.setToolState({
        polygonPoints: [],
        isDrawing: false,
        tempAnnotation: null,
      })
    } else if (e.key === "Backspace" || e.key === "Delete") {
      // Undo last point
      if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
        const newPoints = toolState.polygonPoints.slice(0, -1)
        this.context.setToolState({
          polygonPoints: newPoints,
          isDrawing: newPoints.length > 0,
          tempAnnotation: newPoints.length > 0 ? {
            type: "polygon",
            coordinates: newPoints,
            imageId: this.context.annotationsStore.currentImage?.id || "",
          } : null,
        })
      }
    } else if (e.key === "Enter") {
      // Finish polygon with Enter key
      this.finishPolygon()
    }
  }

  getUIState(): PolygonHandlerUIState {
    return {
      polygonPoints: this.context.toolState.polygonPoints || [],
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
  }
}

