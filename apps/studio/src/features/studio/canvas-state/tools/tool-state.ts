import type { Point, Annotation } from "@/shared/types/core"

/**
 * Live, in-progress editing state shared between the canvas and the active tool
 * handler. It is rewritten on every throttled mousemove while drawing / moving /
 * resizing a shape, so it lives in its own context provider (see
 * `ToolStateValueContext` in `contexts/canvas-context.tsx`).
 *
 * This is the single source of truth for the shape of that state: the canvas
 * context, the tool-handler context, and every handler/strategy type against it.
 * Every key is optional because the setter MERGES partial updates — a handler
 * only ever writes the keys it owns.
 */
export interface ToolState {
  // ── Operation flags ────────────────────────────────────────────────────────
  isDragging?: boolean
  isDrawing?: boolean
  isMoving?: boolean
  isResizing?: boolean
  isDeleting?: boolean

  // ── Drag anchors (box / line / circle / smart-segment) ─────────────────────
  startPoint?: Point | null
  currentPoint?: Point | null

  // ── Multi-vertex tools (polygon / linestrip) ───────────────────────────────
  polygonPoints?: Point[]

  // ── Freehand tool ──────────────────────────────────────────────────────────
  freeDrawPoints?: Point[]

  // ── Move / resize (move tool) ──────────────────────────────────────────────
  movingAnnotationId?: string | null
  movingOffset?: Point | null
  resizingAnnotationId?: string | null
  previewCoordinates?: Point[] | null
  resizeHandle?: string | null

  // ── Shared preview + label-input flow ──────────────────────────────────────
  /** The shape being previewed before it is committed (or `null` to clear). */
  tempAnnotation?: Partial<Annotation> | null
  /** When true the canvas opens the "name this annotation" modal. */
  showLabelInput?: boolean

  // ── Delete tool hover feedback ─────────────────────────────────────────────
  hoveredAnnotation?: Annotation | null
}
