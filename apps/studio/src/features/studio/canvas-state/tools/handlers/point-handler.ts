import type { Annotation } from "@/shared/types/core"
import { ToolHandlerContext } from "./tool-handler-context"
import { ToolHandler } from "../tool-handlers"

export type PointHandlerUIState = {
  tempAnnotation?: Partial<Annotation>
  showLabelInput?: boolean
}

export class PointHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    this.context.setToolState({
      showLabelInput: true,
      tempAnnotation: {
        id: crypto.randomUUID(),
        name: "New Point",
        type: "point",
        color: "#2196f3",
        coordinates: [point],
        imageId: this.context.annotationsStore.currentImage?.id || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  onMouseMove() {}
  onMouseUp() {}

  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.context.setToolState({ tempAnnotation: null, showLabelInput: false })
    }
  }

  getUIState(): PointHandlerUIState {
    return {
      tempAnnotation: this.context.toolState.tempAnnotation || undefined,
      showLabelInput: this.context.toolState.showLabelInput ?? false,
    }
  }
}
