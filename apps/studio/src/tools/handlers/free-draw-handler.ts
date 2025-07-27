import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "@/tools/canvas-handler"
import { ToolHandler } from "../tool-handlers"

export type FreeDrawHandlerUIState = {
  isDrawing: boolean
  tempAnnotation?: Annotation
  showLabelInput?: boolean
}

export class FreeDrawHandler implements ToolHandler{
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

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

    const lastPoint =
      toolState.freeDrawPoints[toolState.freeDrawPoints.length - 1]
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    )

    // Only add point if significant movement
    if (distance > 2) {
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

    if (toolState.freeDrawPoints.length > 3) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          ...toolState.tempAnnotation,
          coordinates: toolState.freeDrawPoints,
        },
      })
    }

    this.context.setToolState({
      isDrawing: false,
      freeDrawPoints: [],
    })
  }

  getUIState(): FreeDrawHandlerUIState {
    return {
      isDrawing: this.context.toolState.isDrawing,
      tempAnnotation: this.context.toolState.tempAnnotation,
      showLabelInput: this.context.toolState.showLabelInput,
    }
  }
}
