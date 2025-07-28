import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../canvas-handler"

export interface AnnotationResizeStrategy {
  canHandle(annotation: Annotation): boolean
  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void
}
