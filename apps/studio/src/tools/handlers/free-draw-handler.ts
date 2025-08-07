import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "@/tools/canvas-handler"
import { ToolHandler } from "../tool-handlers"

export type FreeDrawHandlerUIState = {
  isDrawing: boolean
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

export class FreeDrawHandler implements ToolHandler {
  private lastUpdateTime: number = 0
  // Frame throttling - limit to 60fps maximum (16.67ms)
  private readonly FRAME_THROTTLE_MS = 16

  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return // Only handle left clicks

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    this.context.setToolState({
      isDrawing: true,
      freeDrawPoints: [point],
      tempAnnotation: {
        type: "freeDraw",
        coordinates: [point],
        imageId: this.context.annotationsStore.currentImage?.id || "",
      },
    })
  }

  onMouseMove(_e: React.MouseEvent, point: Point) {
    const { toolState } = this.context
    if (!toolState.isDrawing || !toolState.freeDrawPoints) return

    const now = performance.now()

    // Frame-based throttling - don't update more than 60fps
    if (now - this.lastUpdateTime < this.FRAME_THROTTLE_MS) {
      return
    }

    const lastPoint =
      toolState.freeDrawPoints[toolState.freeDrawPoints.length - 1]

    // Optimize distance calculation using squared distance to avoid Math.sqrt
    const dx = point.x - lastPoint.x
    const dy = point.y - lastPoint.y
    const distanceSquared = dx * dx + dy * dy

    // Only add point if significant movement (smoother drawing)
    // Using squared distance: 1.5^2 = 2.25
    if (distanceSquared > 2.25) {
      this.lastUpdateTime = now
      const newPoints = [...toolState.freeDrawPoints, point]
      this.context.setToolState({
        freeDrawPoints: newPoints,
        tempAnnotation: {
          ...toolState.tempAnnotation,
          coordinates: newPoints,
        },
      })
    }
  }
  onMouseUp() {
    const { toolState } = this.context
    if (!toolState.isDrawing || !toolState.freeDrawPoints) return

    // Require at least 2 points for a valid free draw annotation
    if (toolState.freeDrawPoints.length >= 2) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          ...toolState.tempAnnotation,
          coordinates: toolState.freeDrawPoints,
        },
        isDrawing: false,
      })
    } else {
      // Not enough points, cancel the drawing
      this.context.setToolState({
        isDrawing: false,
        freeDrawPoints: [],
        tempAnnotation: null,
      })
    }
  }

  // Handle escape key to cancel current drawing
  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && this.context.toolState.isDrawing) {
      this.context.setToolState({
        isDrawing: false,
        freeDrawPoints: [],
        tempAnnotation: null,
      })
    }
  }

  getUIState(): FreeDrawHandlerUIState {
    return {
      isDrawing: this.context.toolState.isDrawing ?? false,
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
  }
}
