import { Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../canvas-handler"
import { MouseMoveStrategy } from "../interfaces/mouse-move-strategy"
import { ResizeStrategyManager } from "../managers/resize-strategy-manager"

export class ResizeStrategy implements MouseMoveStrategy {
  private resizeStrategyManager: ResizeStrategyManager

  constructor() {
    this.resizeStrategyManager = new ResizeStrategyManager()
  }

  handle(
    _e: React.MouseEvent,
    point: Point,
    context: ToolHandlerContext
  ): void {
    const { toolState } = context

    if (!toolState.isResizing || !toolState.resizeHandle) return

    const annotation = context.annotationsStore.annotations.find(
      (a) => a.id === context.selectedAnnotation?.id
    )

    if (annotation) {
      this.resizeStrategyManager.resize(
        annotation,
        point,
        toolState.resizeHandle,
        context
      )
    }
  }
}
