import type { Point, Annotation } from "@/shared/types/core"
import { ToolHandlerContext } from "./tool-handler-context"
import { ToolHandler } from "../tool-handlers"

export type BoxHandlerUIState = {
  isDragging: boolean
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

/** Constrain the drag end-point so the box is a perfect square, preserving the
 *  drag direction — the Shift-to-square behavior in Figma/Photoshop/CVAT. */
function squareConstrain(start: Point, point: Point): Point {
  const dx = point.x - start.x
  const dy = point.y - start.y
  const side = Math.max(Math.abs(dx), Math.abs(dy))
  return {
    x: start.x + (dx < 0 ? -side : side),
    y: start.y + (dy < 0 ? -side : side),
  }
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

  onMouseMove(e: React.MouseEvent, point: Point) {
    const { toolState } = this.context
    if (!toolState.isDragging || !toolState.startPoint) return

    // Hold Shift while dragging to lock the box to a square.
    const end = e.shiftKey ? squareConstrain(toolState.startPoint, point) : point

    this.context.setToolState({
      currentPoint: end,
      tempAnnotation: {
        id: "temp", // Temporary ID for preview
        name: "New Box", // Temporary name
        type: "box",
        color: "#2196f3", // Default temporary color (blue)
        coordinates: [
          {
            x: Math.min(toolState.startPoint.x, end.x),
            y: Math.min(toolState.startPoint.y, end.y),
          },
          {
            x: Math.max(toolState.startPoint.x, end.x),
            y: Math.max(toolState.startPoint.y, end.y),
          },
        ],
        itemId: this.context.annotationsStore.currentImage?.id || "",
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

    // Only create annotation for valid boxes (ignore a stray click / micro-drag).
    if (width > 5 && height > 5) {
      this.context.setToolState({
        showLabelInput: true,
        tempAnnotation: {
          id: crypto.randomUUID(), // Generate proper ID for saving
          name: "New Box", // Default name
          type: "box",
          color: "#2196f3", // Default color
          coordinates,
          itemId: this.context.annotationsStore.currentImage?.id || "",
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

