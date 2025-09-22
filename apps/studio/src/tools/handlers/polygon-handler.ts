import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "../../hooks/use-canvas-handlers-context"
import { ToolHandler } from "../tool-handlers"

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

    // Check if we're clicking near the first point to close the polygon
    if (toolState.polygonPoints && toolState.polygonPoints.length >= 3) {
      const firstPoint = toolState.polygonPoints[0]
      // Optimize distance calculation using squared distance
      const dx = point.x - firstPoint.x
      const dy = point.y - firstPoint.y
      const distanceSquared = dx * dx + dy * dy

      // Increased snap area for better UX: 15px radius (15^2 = 225)
      if (distanceSquared <= 225) {
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
    if (toolState.polygonPoints && toolState.polygonPoints.length >= 3) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          type: "polygon",
          coordinates: toolState.polygonPoints,
          imageId: this.context.annotationsStore.currentImage?.id || "",
        },
      })
    }
  }

  // Method to clear polygon state (called after annotation is saved)
  clearState() {
    this.context.setToolState({
      polygonPoints: [],
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
        tempAnnotation: null,
      })
    } else if (e.key === "Backspace" || e.key === "Delete") {
      // Undo last point
      if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
        const newPoints = toolState.polygonPoints.slice(0, -1)
        this.context.setToolState({
          polygonPoints: newPoints,
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
