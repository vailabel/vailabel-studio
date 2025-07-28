import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "../canvas-handler"
import { ToolHandler } from "../tool-handlers"

export type PolygonHandlerUIState = {
  polygonPoints?: Point[]
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

export class PolygonHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return // Only handle left clicks

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    const { toolState } = this.context

    // Check if we're clicking near the first point to close the polygon
    if (toolState.polygonPoints && toolState.polygonPoints.length >= 3) {
      const firstPoint = toolState.polygonPoints[0]
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) +
          Math.pow(point.y - firstPoint.y, 2)
      )

      // If clicking within 10 pixels of the first point, close the polygon
      if (distance <= 10) {
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

  // Handle escape key to cancel current polygon
  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.context.setToolState({
        polygonPoints: [],
        tempAnnotation: null,
      })
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
