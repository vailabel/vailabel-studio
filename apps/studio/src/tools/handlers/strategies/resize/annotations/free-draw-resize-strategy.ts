import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../../hooks/use-canvas-handlers-context"
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

    // For free draw resize, we need to find which vertex is being resized
    // The resizeHandle should contain the vertex index (e.g., "vertex-0", "vertex-1", etc.)
    const vertexMatch = resizeHandle.match(/vertex-(\d+)/)
    if (!vertexMatch) return

    const vertexIndex = parseInt(vertexMatch[1], 10)
    if (vertexIndex < 0 || vertexIndex >= annotation.coordinates.length) return

    // Create new coordinates array with the updated vertex
    const newCoordinates = [...annotation.coordinates]
    newCoordinates[vertexIndex] = point

    // Use preview coordinates during resize
    context.setToolState({
      ...context.toolState,
      previewCoordinates: newCoordinates,
      resizingAnnotationId: annotation.id,
    })
  }
}