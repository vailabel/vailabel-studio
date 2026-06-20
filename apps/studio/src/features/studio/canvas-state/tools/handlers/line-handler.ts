import type { Point, Annotation } from "@/shared/types/core"
import { ToolHandlerContext } from "./tool-handler-context"
import { ToolHandler } from "../tool-handlers"

export type LineHandlerUIState = {
  isDragging: boolean
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

// Two-point line: click-drag from start to end.
export class LineHandler implements ToolHandler {
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
        type: "line",
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

    const start = toolState.startPoint
    const end = toolState.currentPoint
    const length = Math.hypot(end.x - start.x, end.y - start.y)

    if (length > 5) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          id: crypto.randomUUID(),
          name: "New Line",
          type: "line",
          color: "#2196f3",
          coordinates: [start, end],
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

  getUIState(): LineHandlerUIState {
    return {
      isDragging: this.context.toolState.isDragging ?? false,
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
  }
}
