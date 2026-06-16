import { Annotation, Point } from "@/shared/types/core"
import { ToolHandlerContext } from "@/features/studio/canvas-state/tools/handlers/tool-handler-context"

export interface AnnotationResizeStrategy {
  canHandle(annotation: Annotation): boolean
  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void
}
