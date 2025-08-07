import { Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../canvas-handler"
import { MouseMoveStrategy } from "../interfaces/mouse-move-strategy"
import { ResizeStrategy } from "../resize/resize-strategy"
import { MoveStrategy } from "../move/move-strategy"

export class MouseMoveStrategyManager {
  private resizeStrategy: MouseMoveStrategy
  private moveStrategy: MoveStrategy

  constructor() {
    this.resizeStrategy = new ResizeStrategy()
    this.moveStrategy = new MoveStrategy()
  }

  handleMouseMove(
    e: React.MouseEvent,
    point: Point,
    context: ToolHandlerContext
  ): void {
    const { toolState } = context

    // Early return if no operation is in progress
    if (!toolState.isMoving && !toolState.isResizing) return

    // Handle resizing
    if (toolState.isResizing && toolState.resizeHandle) {
      this.resizeStrategy.handle(e, point, context)
      return
    }

    // Handle moving
    if (
      toolState.isMoving &&
      toolState.movingAnnotationId &&
      toolState.movingOffset
    ) {
      this.moveStrategy.handle(e, point, context)
    }
  }

  // Clear caches when operations end
  clearCaches(): void {
    this.moveStrategy.clearCache()
  }
}
