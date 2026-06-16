import type { RefObject } from "react"
import type { Point, Annotation } from "@/shared/types/core"
import type { PipelinePrompt } from "@/shared/ipc/studio"
import type { ToolState } from "../tool-state"

/** The slice of the annotation store a tool handler is allowed to touch. */
export interface ToolHandlerAnnotationsStore {
  annotations: Annotation[]
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<unknown>
  deleteAnnotation: (id: string) => Promise<void>
  currentImage?: { id: string }
}

/**
 * The capabilities a tool handler depends on, owned by the tools layer (the hook
 * `useCanvasHandlers` is just one implementation). Handlers depend on this
 * abstraction — never on the concrete React hook — so the dependency points from
 * the high-level hook down to the low-level tools (DIP).
 */
export interface ToolHandlerContext {
  canvasRef: RefObject<HTMLDivElement | null>
  annotationsStore: ToolHandlerAnnotationsStore

  zoom: number
  panOffset: Point

  /** Live editing state (see {@link ToolState}); read-only for handlers. */
  toolState: ToolState
  /** Merge a partial update into the shared editing state. */
  setToolState: (state: Partial<ToolState>) => void

  setIsPanning: (isPanning: boolean) => void
  setLastPanPoint: (point: Point | null) => void

  selectedAnnotation: Annotation | null
  setSelectedAnnotation: (annotation: Annotation | null) => void

  /** Map a client (screen) point to image-space coordinates. */
  getCanvasCoords: (clientX: number, clientY: number) => Point
  /** Hit-test a single annotation at an image-space point. */
  isPointInLabel: (point: Point, annotation: Annotation) => boolean
  /** Find the top-most annotation under an image-space point. */
  findLabelAtPoint: (point: Point) => Annotation | null
  /** Resolve which resize handle (if any) an image-space point is over. */
  getResizeHandle: (point: Point, annotation: Annotation) => string | null

  /** Run interactive SAM segmentation for the smart-segment tool. Optional so
   *  the canvas works without an AI backend wired in. */
  runSmartSegment?: (prompt: PipelinePrompt) => void | Promise<void>
}
