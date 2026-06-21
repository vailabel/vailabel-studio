import { memo } from "react"
import { Check, X } from "lucide-react"
import type { Prediction } from "@/shared/types/core"

type Offset = { x: number; y: number }

interface PredictionReviewOverlayProps {
  predictions: Prediction[]
  /** centerOffset + panOffset, in screen px (same value the canvas transform uses). */
  baseOffset: Offset
  zoom: number
  onAccept: (predictionId: string) => void
  onReject: (predictionId: string) => void
}

/** Top-right corner of a prediction's bbox in image space, or null when it has no
 *  usable coordinates. */
function topRight(prediction: Prediction): Offset | null {
  const coords = prediction.coordinates as Array<{ x: number; y: number }> | undefined
  if (!Array.isArray(coords) || coords.length === 0) return null
  let maxX = -Infinity
  let minY = Infinity
  for (const point of coords) {
    if (typeof point?.x !== "number" || typeof point?.y !== "number") continue
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
  }
  if (!Number.isFinite(maxX) || !Number.isFinite(minY)) return null
  return { x: maxX, y: minY }
}

/**
 * Floating ✓/✗ controls anchored to each AI prediction on the canvas, so the user
 * accepts/rejects a box right where it sits (instead of a side list). Rendered in
 * the canvas container (screen space), NOT inside the zoom/pan transform — each
 * pill is positioned from image coords via `imgX*zoom + baseOffset` (the same math
 * the crosshair/coordinate overlays use). The wrapper ignores pointer events; only
 * the pills are clickable, and they stop propagation so a click doesn't start a
 * draw on the canvas underneath.
 */
export const PredictionReviewOverlay = memo(
  ({
    predictions,
    baseOffset,
    zoom,
    onAccept,
    onReject,
  }: PredictionReviewOverlayProps) => {
    if (predictions.length === 0) return null
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        {predictions.map((prediction) => {
          const anchor = topRight(prediction)
          if (!anchor) return null
          const left = anchor.x * zoom + baseOffset.x
          const top = anchor.y * zoom + baseOffset.y
          return (
            <div
              key={prediction.id}
              className="pointer-events-auto absolute flex -translate-y-1/2 translate-x-1 items-center gap-0.5 rounded-full border border-border bg-card/95 p-0.5 shadow-md backdrop-blur"
              style={{ left: `${left}px`, top: `${top}px` }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                title="Accept this prediction"
                aria-label="Accept prediction"
                onClick={() => onAccept(prediction.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-success hover:bg-success/15"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Reject this prediction"
                aria-label="Reject prediction"
                onClick={() => onReject(prediction.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }
)

PredictionReviewOverlay.displayName = "PredictionReviewOverlay"
