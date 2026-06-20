import type { Point, Annotation } from "@/shared/types/core"
import type { PipelinePrompt } from "@/shared/ipc/studio"
import { ToolHandlerContext } from "./tool-handler-context"
import { ToolHandler } from "../tool-handlers"

export type SmartSegmentHandlerUIState = {
  isDragging: boolean
  tempAnnotation?: Partial<Annotation>
}

/** Below this image-space drag distance a press-release counts as a click
 *  (a point prompt); beyond it, the drag is treated as a box prompt. */
const CLICK_VS_BOX_THRESHOLD = 4

const PREVIEW_COLOR = "#a855f7" // violet — distinct from the blue draw tools

/**
 * Interactive SAM tool: click an object (point prompt) or drag a box around it
 * (box prompt), and on mouse-up hand the prompt — in IMAGE-space coordinates —
 * to {@link ToolHandlerContext.runSmartSegment}, which resolves the installed
 * SAM model and runs `pipeline_run`. The returned polygon lands in the existing
 * prediction review loop. This handler only builds the prompt + a live preview;
 * the async inference, spinner, and "no SAM model" messaging live in the
 * viewmodel layer (mirrors how detection predictions are surfaced).
 */
export class SmartSegmentHandler implements ToolHandler {
  constructor(private context: ToolHandlerContext) {}

  private get itemId() {
    return this.context.annotationsStore.currentImage?.id || ""
  }

  private pointMarker(point: Point): Partial<Annotation> {
    return {
      id: "temp-sam",
      name: "SAM",
      type: "point",
      color: PREVIEW_COLOR,
      coordinates: [point],
      itemId: this.itemId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  private boxPreview(start: Point, end: Point): Partial<Annotation> {
    return {
      id: "temp-sam",
      name: "SAM",
      type: "box",
      color: PREVIEW_COLOR,
      coordinates: [
        { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
        { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
      ],
      itemId: this.itemId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    const point = this.context.getCanvasCoords(e.clientX, e.clientY)
    this.context.setToolState({
      isDragging: true,
      startPoint: point,
      currentPoint: point,
      tempAnnotation: this.pointMarker(point),
    })
  }

  onMouseMove(_e: React.MouseEvent, point: Point) {
    const { isDragging, startPoint } = this.context.toolState
    if (!isDragging || !startPoint) return

    const isBox =
      Math.abs(point.x - startPoint.x) > CLICK_VS_BOX_THRESHOLD &&
      Math.abs(point.y - startPoint.y) > CLICK_VS_BOX_THRESHOLD

    this.context.setToolState({
      currentPoint: point,
      tempAnnotation: isBox
        ? this.boxPreview(startPoint, point)
        : this.pointMarker(startPoint),
    })
  }

  onMouseUp() {
    const { isDragging, startPoint, currentPoint } = this.context.toolState
    if (!isDragging || !startPoint || !currentPoint) {
      this.reset()
      return
    }

    const isBox =
      Math.abs(currentPoint.x - startPoint.x) > CLICK_VS_BOX_THRESHOLD &&
      Math.abs(currentPoint.y - startPoint.y) > CLICK_VS_BOX_THRESHOLD

    const prompt: PipelinePrompt = isBox
      ? {
          boxes: [
            {
              x1: Math.min(startPoint.x, currentPoint.x),
              y1: Math.min(startPoint.y, currentPoint.y),
              x2: Math.max(startPoint.x, currentPoint.x),
              y2: Math.max(startPoint.y, currentPoint.y),
            },
          ],
        }
      : { points: [{ x: startPoint.x, y: startPoint.y, positive: true }] }

    this.reset()
    void this.context.runSmartSegment?.(prompt)
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && this.context.toolState.isDragging) {
      this.reset()
    }
  }

  private reset() {
    this.context.setToolState({
      isDragging: false,
      startPoint: null,
      currentPoint: null,
      tempAnnotation: null,
    })
  }

  getUIState(): SmartSegmentHandlerUIState {
    return {
      isDragging: this.context.toolState.isDragging ?? false,
      tempAnnotation: this.context.toolState.tempAnnotation ?? undefined,
    }
  }
}
