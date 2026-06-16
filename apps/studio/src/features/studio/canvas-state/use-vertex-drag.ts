import { useCallback, useEffect, useRef, useState } from "react"
import type { Annotation, Point } from "@/shared/types/core"

type UpdateAnnotation = (
  annotationId: string,
  updates: Partial<Annotation>
) => Promise<unknown> | void

interface UseVertexDragOptions {
  annotationId: string
  zoom: number
  readOnly?: boolean
  onUpdateAnnotation?: UpdateAnnotation
}

/**
 * Drag-to-edit a single vertex/handle of a vector annotation (polygon, line,
 * linestrip, circle…).
 *
 * The shapes used to call `onUpdateAnnotation` on EVERY mousemove, which meant a
 * persistence round-trip, an undo-history entry, and a full data refetch per
 * frame — unusable for vertex-dense SAM polygons. This hook instead keeps a
 * local, rAF-throttled **preview** while dragging and commits the result **once**
 * on mouse-up, so a whole drag is a single save + a single undo step.
 *
 * Only the shape being edited re-renders during the drag (the preview is local
 * state), and the preview is held until the committed update lands in the store,
 * so releasing never flickers back to the old position.
 *
 * Render from `previewCoordinates ?? annotation.coordinates`, and start a drag
 * from a handle's `onMouseDown` with `startDrag(e, next => nextCoordinates)`.
 */
export function useVertexDrag({
  annotationId,
  zoom,
  readOnly,
  onUpdateAnnotation,
}: UseVertexDragOptions) {
  const [previewCoordinates, setPreviewCoordinates] = useState<Point[] | null>(
    null
  )
  const frameRef = useRef<number | null>(null)
  const latestRef = useRef<Point[] | null>(null)
  const detachRef = useRef<(() => void) | null>(null)

  // Tear down any in-flight drag if the shape unmounts mid-drag.
  useEffect(
    () => () => {
      detachRef.current?.()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    []
  )

  const startDrag = useCallback(
    (
      e: React.MouseEvent<SVGElement>,
      toCoordinates: (next: Point) => Point[]
    ) => {
      // Stop the canvas-level MoveHandler from also picking this up.
      e.stopPropagation()
      if (readOnly || !onUpdateAnnotation) return

      const svg = e.currentTarget.ownerSVGElement
      if (!svg) return
      // The SVG fills the pan/zoom-transformed container, so its client rect
      // already bakes in pan + zoom; dividing the screen delta by `zoom` yields
      // image-space coordinates (same mapping the shapes used before).
      const rect = svg.getBoundingClientRect()

      const flush = () => {
        frameRef.current = null
        if (latestRef.current) setPreviewCoordinates(latestRef.current)
      }

      const onMove = (moveEvent: MouseEvent) => {
        const next: Point = {
          x: (moveEvent.clientX - rect.left) / zoom,
          y: (moveEvent.clientY - rect.top) / zoom,
        }
        latestRef.current = toCoordinates(next)
        // Coalesce bursts of mousemove into one render per animation frame.
        if (frameRef.current === null) {
          frameRef.current = requestAnimationFrame(flush)
        }
      }

      const finish = () => {
        detachRef.current?.()
        detachRef.current = null
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current)
          frameRef.current = null
        }

        const final = latestRef.current
        latestRef.current = null

        if (!final) {
          setPreviewCoordinates(null)
          return
        }

        // Keep the preview on screen until the committed coordinates arrive back
        // through `annotation.coordinates`, so there's no one-frame snap-back.
        Promise.resolve(
          onUpdateAnnotation(annotationId, {
            coordinates: final,
            updatedAt: new Date(),
          })
        )
          .catch((error) => {
            console.error("Failed to update annotation vertex:", error)
          })
          .finally(() => setPreviewCoordinates(null))
      }

      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", finish)
      detachRef.current = () => {
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", finish)
      }
    },
    [annotationId, zoom, readOnly, onUpdateAnnotation]
  )

  return { previewCoordinates, startDrag }
}
