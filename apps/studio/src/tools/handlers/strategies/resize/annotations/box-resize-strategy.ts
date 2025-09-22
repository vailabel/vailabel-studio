import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../../hooks/use-canvas-handlers-context"
import { AnnotationResizeStrategy } from "../../interfaces/annotation-resize-strategy"

export class BoxResizeStrategy implements AnnotationResizeStrategy {
  canHandle(annotation: Annotation): boolean {
    return annotation.type === "box"
  }

  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void {
    if (!this.canHandle(annotation)) return

    const [topLeft, bottomRight] = annotation.coordinates
    let newTopLeft = { ...topLeft }
    let newBottomRight = { ...bottomRight }

    switch (resizeHandle) {
      case "top-left":
        newTopLeft = point
        break
      case "top-right":
        newTopLeft.y = point.y
        newBottomRight.x = point.x
        break
      case "bottom-left":
        newTopLeft.x = point.x
        newBottomRight.y = point.y
        break
      case "bottom-right":
        newBottomRight = point
        break
      case "top":
        newTopLeft.y = point.y
        break
      case "right":
        newBottomRight.x = point.x
        break
      case "bottom":
        newBottomRight.y = point.y
        break
      case "left":
        newTopLeft.x = point.x
        break
    }

    // Ensure coordinates are always [topLeft, bottomRight] with topLeft above/left of bottomRight
    const normalizedTopLeft = {
      x: Math.min(newTopLeft.x, newBottomRight.x),
      y: Math.min(newTopLeft.y, newBottomRight.y),
    }
    const normalizedBottomRight = {
      x: Math.max(newTopLeft.x, newBottomRight.x),
      y: Math.max(newTopLeft.y, newBottomRight.y),
    }

    // Use preview coordinates during resize instead of immediately updating
    context.setToolState({
      ...context.toolState,
      previewCoordinates: [normalizedTopLeft, normalizedBottomRight],
      resizingAnnotationId: annotation.id,
    })
  }
}
