// No imports needed
import { ToolHandlerContext } from "@/tools/canvas-handler"
import { ToolHandler } from "../tool-handlers"

export type DeleteHandlerUIState = Record<string, never>

export class DeleteHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    const annotation = this.context.findLabelAtPoint(point)

    if (annotation) {
      this.context.annotationsStore.deleteAnnotation(annotation.id)
      this.context.canvasStore.setSelectedAnnotation(null)
    }
  }

  onMouseMove() {}

  onMouseUp() {}

  getUIState(): DeleteHandlerUIState {
    return {}
  }
}
