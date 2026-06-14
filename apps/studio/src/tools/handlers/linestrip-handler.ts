import type { Point, Annotation } from "@/types/core"
import { ToolHandlerContext } from "../../hooks/use-canvas-handlers-context"
import { ToolHandler } from "../tool-handlers"

export type LinestripHandlerUIState = {
  polygonPoints?: Point[]
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

// Open multi-point polyline (LabelMe "linestrip"). Reuses polygonPoints state
// for the in-progress vertices but never closes the shape.
export class LinestripHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    const { toolState } = this.context

    // Right-click removes the last vertex.
    if (e.button === 2) {
      if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
        const newPoints = toolState.polygonPoints.slice(0, -1)
        this.context.setToolState({
          polygonPoints: newPoints,
          isDrawing: newPoints.length > 0,
          tempAnnotation:
            newPoints.length > 0
              ? {
                  type: "linestrip",
                  coordinates: newPoints,
                  imageId: this.context.annotationsStore.currentImage?.id || "",
                }
              : null,
        })
      }
      return
    }

    if (e.button !== 0) return

    const newPoints = toolState.polygonPoints
      ? [...toolState.polygonPoints, point]
      : [point]

    this.context.setToolState({
      polygonPoints: newPoints,
      // Keep mousemove forwarding alive so the preview segment to the cursor renders.
      isDrawing: true,
      tempAnnotation: {
        type: "linestrip",
        coordinates: newPoints,
        imageId: this.context.annotationsStore.currentImage?.id || "",
      },
    })
  }

  onMouseMove(_e: React.MouseEvent, point: Point) {
    const { toolState } = this.context
    if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
      this.context.setToolState({
        tempAnnotation: {
          type: "linestrip",
          coordinates: [...toolState.polygonPoints, point],
          imageId: this.context.annotationsStore.currentImage?.id || "",
        },
      })
    }
  }

  onMouseUp() {}

  onDoubleClick() {
    this.finishLinestrip()
  }

  private finishLinestrip() {
    const { toolState } = this.context
    if (toolState.polygonPoints && toolState.polygonPoints.length >= 2) {
      this.context.setToolState({
        showLabelInput: true,
        isDrawing: false,
        tempAnnotation: {
          id: crypto.randomUUID(),
          name: "New Line",
          type: "linestrip",
          color: "#2196f3",
          coordinates: toolState.polygonPoints,
          imageId: this.context.annotationsStore.currentImage?.id || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    }
  }

  onKeyDown(e: KeyboardEvent) {
    const { toolState } = this.context
    if (e.key === "Escape") {
      this.context.setToolState({
        polygonPoints: [],
        isDrawing: false,
        tempAnnotation: null,
      })
    } else if (e.key === "Backspace" || e.key === "Delete") {
      if (toolState.polygonPoints && toolState.polygonPoints.length > 0) {
        const newPoints = toolState.polygonPoints.slice(0, -1)
        this.context.setToolState({
          polygonPoints: newPoints,
          isDrawing: newPoints.length > 0,
          tempAnnotation:
            newPoints.length > 0
              ? {
                  type: "linestrip",
                  coordinates: newPoints,
                  imageId: this.context.annotationsStore.currentImage?.id || "",
                }
              : null,
        })
      }
    } else if (e.key === "Enter") {
      this.finishLinestrip()
    }
  }

  getUIState(): LinestripHandlerUIState {
    return {
      polygonPoints: this.context.toolState.polygonPoints || [],
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
  }
}
