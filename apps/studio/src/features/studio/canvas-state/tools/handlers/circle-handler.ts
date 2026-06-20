import type { Point, Annotation } from "@/shared/types/core"
import { ToolHandlerContext } from "./tool-handler-context"
import { ToolHandler } from "../tool-handlers"

export type CircleHandlerUIState = {
  isDragging: boolean
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

// Circle defined by [center, edge]; drag from center outward to set radius.
export class CircleHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    this.context.setToolState({
      isDragging: true,
      startPoint: point,
      currentPoint: point,
    })
  }

  onMouseMove(_e: React.MouseEvent, point: Point) {
    const { toolState } = this.context
    if (!toolState.isDragging || !toolState.startPoint) return

    this.context.setToolState({
      currentPoint: point,
      tempAnnotation: {
        type: "circle",
        color: "#2196f3",
        coordinates: [toolState.startPoint, point],
        itemId: this.context.annotationsStore.currentImage?.id || "",
      },
    })
  }

  onMouseUp() {
    const { toolState } = this.context
    if (!toolState.isDragging || !toolState.startPoint || !toolState.currentPoint) {
      return
    }

    const center = toolState.startPoint
    const edge = toolState.currentPoint
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y)

    if (radius > 3) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          id: crypto.randomUUID(),
          name: "New Circle",
          type: "circle",
          color: "#2196f3",
          coordinates: [center, edge],
          itemId: this.context.annotationsStore.currentImage?.id || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isDragging: false,
        startPoint: null,
        currentPoint: null,
      })
    } else {
      this.context.setToolState({
        isDragging: false,
        startPoint: null,
        currentPoint: null,
        tempAnnotation: null,
      })
    }
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && this.context.toolState.isDragging) {
      this.context.setToolState({
        isDragging: false,
        startPoint: null,
        currentPoint: null,
        tempAnnotation: null,
      })
    }
  }

  getUIState(): CircleHandlerUIState {
    return {
      isDragging: this.context.toolState.isDragging ?? false,
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
  }
}
