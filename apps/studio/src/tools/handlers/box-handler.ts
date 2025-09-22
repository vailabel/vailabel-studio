import type { Point, Annotation } from "@vailabel/core"
import { ToolHandlerContext } from "../../hooks/use-canvas-handlers-context"
import { ToolHandler } from "../tool-handlers"

export type BoxHandlerUIState = {
  isDragging: boolean
  tempAnnotation?: Partial<Annotation>
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
        id: "temp", // Temporary ID for preview
        name: "New Box", // Temporary name
        type: "box",
        color: "#2196f3", // Default temporary color (blue)
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
        imageId: this.context.annotationsStore.currentImage?.id || "",
        createdAt: new Date(),
        updatedAt: new Date(),
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
    ) {
      return
    }

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

    const width = coordinates[1].x - coordinates[0].x
    const height = coordinates[1].y - coordinates[0].y
    console.log("BoxHandler onMouseUp - box dimensions:", { width, height })

    // Only create annotation for valid boxes
    if (width > 5 && height > 5) {
      console.log("BoxHandler onMouseUp - Setting showLabelInput to TRUE")
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          id: crypto.randomUUID(), // Generate proper ID for saving
          name: "New Box", // Default name
          type: "box",
          color: "#2196f3", // Default color
          coordinates,
          imageId: this.context.annotationsStore.currentImage?.id || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isDragging: false,
        startPoint: null,
        currentPoint: null,
      })
    } else {
      // Clear state for invalid boxes
      this.context.setToolState({
        isDragging: false,
        startPoint: null,
        currentPoint: null,
        tempAnnotation: null,
      })
    }
  }

  // Handle escape key to cancel current drawing
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

  getUIState(): BoxHandlerUIState {
    const uiState = {
      isDragging: this.context.toolState.isDragging ?? false,
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
    return uiState
  }
}
