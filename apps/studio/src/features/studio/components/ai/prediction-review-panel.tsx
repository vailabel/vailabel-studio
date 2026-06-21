import { useState } from "react"
import { CheckCheck, Loader2, Sparkles, X } from "lucide-react"
import type { Prediction } from "@/shared/types/core"
import { Button } from "@/shared/ui/button"

interface PredictionReviewPanelProps {
  predictions: Prediction[]
  /** Accept/reject every current prediction at once. Returns how many were
   *  processed (used for the "retrain to improve" nudge). */
  onAcceptAll?: () => Promise<number>
  onRejectAll?: () => Promise<number>
}

/**
 * Batch review bar for AI predictions. Per-box accept/reject now happens directly
 * on the canvas (the ✓/✗ pills); this surfaces the count and the bulk actions for
 * the whole image. Renders nothing when there are no predictions.
 */
export function PredictionReviewPanel({
  predictions,
  onAcceptAll,
  onRejectAll,
}: PredictionReviewPanelProps) {
  const [isBatching, setIsBatching] = useState(false)

  if (predictions.length === 0) return null

  const runBatch = async (run: () => Promise<number>) => {
    if (isBatching) return
    setIsBatching(true)
    try {
      await run()
    } finally {
      setIsBatching(false)
    }
  }

  return (
    <div className="w-full rounded-xl border border-success/30 bg-card/95 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            AI Predictions
            <span className="ml-1.5 font-normal text-muted-foreground">
              {predictions.length}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Review each with the ✓/✗ on its box — or act on all of them:
          </p>
        </div>
      </div>

      {(onAcceptAll || onRejectAll) && (
        <div className="flex gap-2">
          {onAcceptAll && (
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              disabled={isBatching}
              onClick={() => void runBatch(onAcceptAll)}
            >
              {isBatching ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              )}
              Accept all
            </Button>
          )}
          {onRejectAll && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs"
              disabled={isBatching}
              onClick={() => void runBatch(onRejectAll)}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reject all
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
