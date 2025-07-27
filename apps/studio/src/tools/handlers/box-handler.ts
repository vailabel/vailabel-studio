import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "@/tools/canvas-handler"
import { ToolHandler } from "../tool-handlers"


export type BoxHandlerUIState = {
  isDragging: boolean
  tempAnnotation?: Annotation
  showLabelInput?: boolean
}

export class BoxHandler implements ToolHandler {
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
        type: "box",
        coordinates: [
          {
            x: Math.min(toolState.startPoint.x, point.x),
            y: Math.min(toolState.startPoint.y, point.y),
          },
          {
            x: Math.max(toolState.startPoint.x, point.x),
            y: Math.max(toolState.startPoint.y, point.y),
          },
        ],
      },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMouseUp(_e?: React.MouseEvent) {
    const { toolState } = this.context
    if (
      !toolState.isDragging ||
      !toolState.startPoint ||
      !toolState.currentPoint
    )
      return

    const coordinates = [
      {
        x: Math.min(toolState.startPoint.x, toolState.currentPoint.x),
        y: Math.min(toolState.startPoint.y, toolState.currentPoint.y),
      },
      {
        x: Math.max(toolState.startPoint.x, toolState.currentPoint.x),
        y: Math.max(toolState.startPoint.y, toolState.currentPoint.y),
      },
    ]

    // Only create annotation for valid boxes
    if (
      coordinates[1].x - coordinates[0].x > 5 &&
      coordinates[1].y - coordinates[0].y > 5
    ) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          type: "box",
          coordinates,
          imageId: this.context.annotationsStore.currentImage?.id || "",
        },
      })
    }

    this.context.setToolState({
      isDragging: false,
      startPoint: null,
      currentPoint: null,
    })
  }

  getUIState(): BoxHandlerUIState {
    return {
      isDragging: this.context.toolState.isDragging,
      tempAnnotation: this.context.toolState.tempAnnotation,
      showLabelInput: this.context.toolState.showLabelInput,
    }
  }
}
