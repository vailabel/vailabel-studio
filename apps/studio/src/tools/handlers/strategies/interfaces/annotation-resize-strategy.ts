import { Annotation, Point } from "@/types/core"
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
