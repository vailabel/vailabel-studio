import { Annotation, Point } from "@/types/core"
import { ToolHandlerContext } from "@/hooks/use-canvas-handlers-context"

export interface AnnotationResizeStrategy {
  canHandle(annotation: Annotation): boolean
  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void
}
