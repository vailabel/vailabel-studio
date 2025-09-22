import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "../../hooks/use-canvas-handlers-context"
import { ToolHandler } from "../tool-handlers"

export type DeleteHandlerUIState = {
  hoveredAnnotation?: Annotation | null
  isDeleting?: boolean
}

export class DeleteHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    const annotation = this.context.findLabelAtPoint(point)

    if (annotation) {
      // Show deleting state briefly
      this.context.setToolState({
        isDeleting: true,
      })
      
      // Delete the annotation
      this.context.annotationsStore.deleteAnnotation(annotation.id)
      this.context.setSelectedAnnotation(null)
      
      // Clear deleting state after a short delay
      setTimeout(() => {
        this.context.setToolState({
          isDeleting: false,
        })
      }, 200)
    }
  }

  onMouseMove(_e: React.MouseEvent, point: Point) {
    // Update hovered annotation for visual feedback
    const annotation = this.context.findLabelAtPoint(point)
    this.context.setToolState({
      hoveredAnnotation: annotation,
    })
  }

  onMouseUp() {
    // Clear hovered annotation when mouse is released
    this.context.setToolState({
      hoveredAnnotation: null,
    })
  }

  // Handle escape key to cancel deletion mode
  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.context.setToolState({
        hoveredAnnotation: null,
        isDeleting: false,
      })
    }
  }

  getUIState(): DeleteHandlerUIState {
    return {
      hoveredAnnotation: this.context.toolState.hoveredAnnotation as Annotation | null || null,
      isDeleting: (this.context.toolState.isDeleting as boolean) ?? false,
    }
  }
}

