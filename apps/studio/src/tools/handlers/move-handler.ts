import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../canvas-handler"
import { calculatePolygonCentroid } from "@/lib/canvas-utils"
import { ToolHandler } from "../tool-handlers"

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
  constructor(private context: ToolHandlerContext) {}

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

  onMouseMove(_e: React.MouseEvent, point: Point) {
    const { toolState } = this.context
    if (!toolState.isMoving && !toolState.isResizing) return

    // Handle resizing
    if (toolState.isResizing && toolState.resizeHandle) {
      const annotation = this.context.annotationsStore.annotations.find(
        (a) => a.id === this.context.canvasStore.selectedAnnotation?.id
      )

      if (annotation?.type === "box") {
        const [topLeft, bottomRight] = annotation.coordinates
        let newTopLeft = { ...topLeft }
        let newBottomRight = { ...bottomRight }

        switch (toolState.resizeHandle) {
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
        this.context.setToolState({
          ...this.context.toolState,
          previewCoordinates: [normalizedTopLeft, normalizedBottomRight],
          resizingAnnotationId: annotation.id,
        })
      }
      return
    }

    // Always update previewCoordinates for all annotation types while moving
    if (
      toolState.isMoving &&
      toolState.movingAnnotationId &&
      toolState.movingOffset
    ) {
      const annotation = this.context.annotationsStore.annotations.find(
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
        this.context.setToolState({
          ...this.context.toolState,
          previewCoordinates,
          isMoving: true,
          movingAnnotationId: toolState.movingAnnotationId,
          movingOffset: toolState.movingOffset,
        })
      }
    }
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
        this.context.annotationsStore.updateAnnotation(annotation.id, annotation)
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
      isResizing: this.context.toolState.isResizing,
      resizeHandle: this.context.toolState.resizeHandle,
      movingAnnotationId: this.context.toolState.movingAnnotationId,
      resizingAnnotationId: this.context.toolState.resizingAnnotationId,
      previewCoordinates: this.context.toolState.previewCoordinates,
      getMovingCoordinates,
      getResizingCoordinates,
    }
  }
}
