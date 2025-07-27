import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "../canvas-handler"
import { ToolHandler } from "../tool-handlers"

export type PolygonHandlerUIState = {
  polygonPoints?: Point[]
  tempAnnotation?: Annotation
  showLabelInput?: boolean
}

export class PolygonHandler implements ToolHandler{
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    const newPoints = this.context.toolState.polygonPoints
      ? [...this.context.toolState.polygonPoints, point]
      : [point]

    this.context.setToolState({
      polygonPoints: newPoints,
    })
  }

  onMouseMove() {}

  onMouseUp() {}

  onDoubleClick() {
    const { toolState } = this.context
    if (toolState.polygonPoints && toolState.polygonPoints.length >= 3) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          type: "polygon",
          coordinates: toolState.polygonPoints,
          imageId: this.context.annotationsStore.currentImage?.id || "",
        },
        polygonPoints: [],
      })
    }
  }

  getUIState(): PolygonHandlerUIState {
    return {
      polygonPoints: this.context.toolState.polygonPoints,
      tempAnnotation: this.context.toolState.tempAnnotation,
      showLabelInput: this.context.toolState.showLabelInput,
    }
  }
}
