import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../canvas-handler"
import { calculatePolygonCentroid } from "@/lib/canvas-utils"
import { ToolHandler } from "../tool-handlers"
import { MouseMoveStrategyManager } from "./strategies/managers"

export type MoveHandlerUIState = {
  isResizing: boolean
  resizeHandle: string | null
  movingAnnotationId?: string | null
  resizingAnnotationId?: string | null
  previewCoordinates?: Point[] | null
  getMovingCoordinates?: () => Point[] | null
  getResizingCoordinates?: () => Point[] | null
}

export class MoveHandler implements ToolHandler {
  private mouseMoveStrategyManager: MouseMoveStrategyManager

  constructor(private context: ToolHandlerContext) {
    this.mouseMoveStrategyManager = new MouseMoveStrategyManager()
  }

  onMouseDown(e: React.MouseEvent) {
    const { getCanvasCoords, findLabelAtPoint, getResizeHandle } = this.context
    const point = getCanvasCoords(e.clientX, e.clientY)
    const annotation: Annotation | null = findLabelAtPoint(point)

    // Handle resize
    if (this.context.canvasStore.selectedAnnotation) {
      const selected = this.context.annotationsStore.annotations.find(
        (a) => a.id === this.context.canvasStore.selectedAnnotation?.id
      )
      if (selected) {
        const handle = getResizeHandle(e, selected)
        if (handle) {
          this.context.setToolState({
            ...this.context.toolState,
            isResizing: true,
            resizeHandle: handle,
          })
          return
        }
      }
    }

    // Handle selection and moving
    if (e.button === 0) {
      if (annotation) {
        this.context.canvasStore.setSelectedAnnotation(annotation)

        let movingOffset: Point | null = null
        if (annotation.type === "box") {
          const [topLeft] = annotation.coordinates
          movingOffset = { x: point.x - topLeft.x, y: point.y - topLeft.y }
        } else if (annotation.type === "polygon") {
          const centroid = calculatePolygonCentroid(annotation.coordinates)
          movingOffset = { x: point.x - centroid.x, y: point.y - centroid.y }
        } else if (annotation.type === "freeDraw") {
          const firstPoint = annotation.coordinates[0]
          movingOffset = {
            x: point.x - firstPoint.x,
            y: point.y - firstPoint.y,
          }
        }

        this.context.setToolState({
          ...this.context.toolState,
          movingAnnotationId: annotation.id,
          movingOffset,
          isMoving: true,
        })
      } else {
        // Start panning with alt+click or middle button
        if (e.altKey || (e.button && e.button === 1)) {
          this.context.setIsPanning(true)
          this.context.setLastPanPoint({ x: e.clientX, y: e.clientY })
        }
      }
    }
  }

  onMouseMove(e: React.MouseEvent, point: Point) {
    this.mouseMoveStrategyManager.handleMouseMove(e, point, this.context)
  }

  onMouseUp() {
    const { toolState } = this.context

    // Commit resize if in progress
    if (
      toolState.isResizing &&
      toolState.resizingAnnotationId &&
      toolState.previewCoordinates
    ) {
      const annotation = this.context.annotationsStore.annotations.find(
        (a) => a.id === toolState.resizingAnnotationId
      )
      if (annotation) {
        annotation.coordinates = toolState.previewCoordinates
        annotation.updatedAt = new Date()
        // Save the resized annotation with updated timestamp
        this.context.annotationsStore.updateAnnotation(
          annotation.id,
          annotation
        )
      }
    }

    // Commit move if in progress
    if (
      toolState.isMoving &&
      toolState.movingAnnotationId &&
      toolState.movingOffset &&
      toolState.previewCoordinates
    ) {
      const annotation = this.context.annotationsStore.annotations.find(
        (a) => a.id === toolState.movingAnnotationId
      )
      if (annotation) {
        annotation.coordinates = toolState.previewCoordinates
        annotation.updatedAt = new Date()
        // Save the moved annotation with updated timestamp
        this.context.annotationsStore.updateAnnotation(
          annotation.id,
          annotation
        )
      }
    }

    // End move/resize operation and clear state
    this.context.setToolState({
      ...this.context.toolState,
      isResizing: false,
      resizeHandle: null,
      resizingAnnotationId: null,
      movingAnnotationId: null,
      movingOffset: null,
      isMoving: false,
      previewCoordinates: null,
    })
  }

  // Handle escape key to cancel current operations
  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.context.setToolState({
        isResizing: false,
        resizeHandle: null,
        movingAnnotationId: null,
        resizingAnnotationId: null,
        movingOffset: null,
        previewCoordinates: null,
      })
    }
  }

  getUIState(): MoveHandlerUIState {
    const getMovingCoordinates = () => {
      const { movingAnnotationId, previewCoordinates } = this.context.toolState
      if (movingAnnotationId) {
        if (previewCoordinates) return previewCoordinates
        const annotation = this.context.annotationsStore.annotations.find(
          (a) => a.id === movingAnnotationId
        )
        if (annotation) return annotation.coordinates
      }
      return null
    }

    const getResizingCoordinates = () => {
      const { resizingAnnotationId, previewCoordinates } =
        this.context.toolState
      if (resizingAnnotationId) {
        if (previewCoordinates) return previewCoordinates
        const annotation = this.context.annotationsStore.annotations.find(
          (a) => a.id === resizingAnnotationId
        )
        if (annotation) return annotation.coordinates
      }
      return null
    }

    return {
      isResizing: this.context.toolState.isResizing ?? false,
      resizeHandle: this.context.toolState.resizeHandle ?? null,
      movingAnnotationId: this.context.toolState.movingAnnotationId,
      resizingAnnotationId: this.context.toolState.resizingAnnotationId,
      previewCoordinates: this.context.toolState.previewCoordinates,
      getMovingCoordinates,
      getResizingCoordinates,
    }
  }
}
