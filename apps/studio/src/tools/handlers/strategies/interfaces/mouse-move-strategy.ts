import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../canvas-handler"

export interface MouseMoveStrategy {
  handle(e: React.MouseEvent, point: Point, context: ToolHandlerContext): void
}

export interface MouseMoveStrategyContext {
  annotation: Annotation
  toolState: {
    isResizing?: boolean
    resizeHandle?: string | null
    movingAnnotationId?: string | null
    resizingAnnotationId?: string | null
    previewCoordinates?: Point[] | null
    movingOffset?: Point | null
    isMoving?: boolean
  }
  point: Point
  context: ToolHandlerContext
}
