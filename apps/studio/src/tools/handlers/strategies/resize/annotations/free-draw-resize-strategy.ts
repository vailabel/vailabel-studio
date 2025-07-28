import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../../canvas-handler"
import { AnnotationResizeStrategy } from "../../interfaces/annotation-resize-strategy"

export class FreeDrawResizeStrategy implements AnnotationResizeStrategy {
  canHandle(annotation: Annotation): boolean {
    return annotation.type === "freeDraw"
  }

  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void {
    if (!this.canHandle(annotation)) return

    // For free draw resize, we can modify individual points
    // The resizeHandle should contain the point index (e.g., "point-0", "point-1", etc.)
    const pointMatch = resizeHandle.match(/point-(\d+)/)
    if (!pointMatch) {
      // If no specific point index, treat it as moving the entire drawing
      // This could be enhanced to scale the entire drawing from a center point
      return
    }

    const pointIndex = parseInt(pointMatch[1], 10)
    if (pointIndex < 0 || pointIndex >= annotation.coordinates.length) return

    // Create new coordinates array with the updated point
    const newCoordinates = [...annotation.coordinates]
    newCoordinates[pointIndex] = point

    // Use preview coordinates during resize
    context.setToolState({
      ...context.toolState,
      previewCoordinates: newCoordinates,
      resizingAnnotationId: annotation.id,
    })
  }
}
