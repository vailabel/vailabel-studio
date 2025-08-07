import { Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../../canvas-handler"
import { MouseMoveStrategy } from "../interfaces/mouse-move-strategy"
import { calculatePolygonCentroid } from "@/lib/canvas-utils"

export class MoveStrategy implements MouseMoveStrategy {
  private lastPoint: Point | null = null
  private cachedCentroid: Map<string, Point> = new Map()
  private lastPreviewCoordinates: Point[] | null = null
  private lastUpdateTime: number = 0

  // Movement threshold in pixels to reduce unnecessary updates
  private readonly MOVEMENT_THRESHOLD = 2
  // Frame throttling - limit to 60fps maximum (16.67ms)
  private readonly FRAME_THROTTLE_MS = 16

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

    const now = performance.now()

    // Frame-based throttling - don't update more than 60fps
    if (now - this.lastUpdateTime < this.FRAME_THROTTLE_MS) {
      return
    }

    // Skip if movement is below threshold
    if (this.lastPoint) {
      const dx = Math.abs(point.x - this.lastPoint.x)
      const dy = Math.abs(point.y - this.lastPoint.y)
      if (dx < this.MOVEMENT_THRESHOLD && dy < this.MOVEMENT_THRESHOLD) {
        return
      }
    }

    this.lastPoint = point
    this.lastUpdateTime = now

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
      // Cache centroid calculation for better performance
      let anchor = this.cachedCentroid.get(annotation.id)
      if (!anchor) {
        anchor = calculatePolygonCentroid(annotation.coordinates)
        this.cachedCentroid.set(annotation.id, anchor)
      }

      const newAnchor = {
        x: point.x - toolState.movingOffset.x,
        y: point.y - toolState.movingOffset.y,
      }
      const dx = newAnchor.x - anchor.x
      const dy = newAnchor.y - anchor.y

      // Optimize coordinate mapping with pre-allocation
      previewCoordinates = new Array(annotation.coordinates.length)
      for (let i = 0; i < annotation.coordinates.length; i++) {
        const p = annotation.coordinates[i]
        previewCoordinates[i] = { x: p.x + dx, y: p.y + dy }
      }
    } else if (annotation.type === "freeDraw") {
      const anchor = annotation.coordinates[0]
      const newAnchor = {
        x: point.x - toolState.movingOffset.x,
        y: point.y - toolState.movingOffset.y,
      }
      const dx = newAnchor.x - anchor.x
      const dy = newAnchor.y - anchor.y

      // Optimize coordinate mapping with pre-allocation
      previewCoordinates = new Array(annotation.coordinates.length)
      for (let i = 0; i < annotation.coordinates.length; i++) {
        const p = annotation.coordinates[i]
        previewCoordinates[i] = { x: p.x + dx, y: p.y + dy }
      }
    }

    if (previewCoordinates) {
      // Check if coordinates actually changed to avoid unnecessary state updates
      if (
        !this.coordinatesEqual(previewCoordinates, this.lastPreviewCoordinates)
      ) {
        this.lastPreviewCoordinates = previewCoordinates
        context.setToolState({
          previewCoordinates,
        })
      }
    }
  }

  // Helper method to compare coordinate arrays efficiently
  private coordinatesEqual(
    coords1: Point[] | null,
    coords2: Point[] | null
  ): boolean {
    if (!coords1 || !coords2) return coords1 === coords2
    if (coords1.length !== coords2.length) return false

    // Quick reference equality check first
    if (coords1 === coords2) return true

    // Compare coordinates with tolerance for floating point precision
    const tolerance = 0.0001
    for (let i = 0; i < coords1.length; i++) {
      const dx = Math.abs(coords1[i].x - coords2[i].x)
      const dy = Math.abs(coords1[i].y - coords2[i].y)
      if (dx > tolerance || dy > tolerance) {
        return false
      }
    }
    return true
  }

  // Clear cache when moving operation ends
  clearCache(): void {
    this.cachedCentroid.clear()
    this.lastPoint = null
    this.lastPreviewCoordinates = null
    this.lastUpdateTime = 0
  }
}
