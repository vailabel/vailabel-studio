import { Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../canvas-handler"
import { MouseMoveStrategy } from "../interfaces/mouse-move-strategy"
import { calculatePolygonCentroid } from "@/lib/canvas-utils"

export class MoveStrategy implements MouseMoveStrategy {
  handle(
    _e: React.MouseEvent,
    point: Point,
    context: ToolHandlerContext
  ): void {
    const { toolState } = context

    if (
      !toolState.isMoving ||
      !toolState.movingAnnotationId ||
      !toolState.movingOffset
    ) {
      return
    }

    const annotation = context.annotationsStore.annotations.find(
      (a) => a.id === toolState.movingAnnotationId
    )

    if (!annotation) return

    let previewCoordinates: Point[] | null = null

    if (annotation.type === "box") {
      const [topLeft, bottomRight] = annotation.coordinates
      const width = bottomRight.x - topLeft.x
      const height = bottomRight.y - topLeft.y
      const newTopLeft = {
        x: point.x - toolState.movingOffset.x,
        y: point.y - toolState.movingOffset.y,
      }
      previewCoordinates = [
        newTopLeft,
        { x: newTopLeft.x + width, y: newTopLeft.y + height },
      ]
    } else if (annotation.type === "polygon") {
      const anchor = calculatePolygonCentroid(annotation.coordinates)
      const newAnchor = {
        x: point.x - toolState.movingOffset.x,
        y: point.y - toolState.movingOffset.y,
      }
      const dx = newAnchor.x - anchor.x
      const dy = newAnchor.y - anchor.y
      previewCoordinates = annotation.coordinates.map((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      }))
    } else if (annotation.type === "freeDraw") {
      const anchor = annotation.coordinates[0]
      const newAnchor = {
        x: point.x - toolState.movingOffset.x,
        y: point.y - toolState.movingOffset.y,
      }
      const dx = newAnchor.x - anchor.x
      const dy = newAnchor.y - anchor.y
      previewCoordinates = annotation.coordinates.map((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      }))
    }

    if (previewCoordinates) {
      context.setToolState({
        ...context.toolState,
        previewCoordinates,
        isMoving: true,
        movingAnnotationId: toolState.movingAnnotationId,
        movingOffset: toolState.movingOffset,
      })
    }
  }
}
