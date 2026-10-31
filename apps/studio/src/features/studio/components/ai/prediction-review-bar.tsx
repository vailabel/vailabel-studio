import { memo, useState } from "react"
import { Check, Loader2, Sparkles, X } from "lucide-react"
import type { Prediction } from "@/shared/types/core"
import { Button } from "@/shared/ui/button"

interface PredictionReviewBarProps {
  predictions: Prediction[]
  onAcceptAll: () => Promise<unknown>
  onRejectAll: () => Promise<unknown>
}

/**
 * Floating bar over the canvas whenever AI suggestions are waiting: says what
 * they are, how to review them one by one, and offers Accept all / Reject all —
 * so the review step is visible without opening the Copilot tab.
 */
export const PredictionReviewBar = memo(
  ({ predictions, onAcceptAll, onRejectAll }: PredictionReviewBarProps) => {
    const [busy, setBusy] = useState<"accept" | "reject" | null>(null)
    if (predictions.length === 0) return null

    const run = async (kind: "accept" | "reject") => {
      setBusy(kind)
      try {
        await (kind === "accept" ? onAcceptAll() : onRejectAll())
      } finally {
        setBusy(null)
      }
    }

    const count = predictions.length
    return (
      <div
        className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-success/40 bg-card/95 py-1 pl-3 pr-1 text-sm shadow-lg backdrop-blur"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Sparkles className="size-4 flex-shrink-0 text-success" />
        <span className="whitespace-nowrap">
          <strong>{count}</strong> AI suggestion{count === 1 ? "" : "s"}
          <span className="hidden text-muted-foreground md:inline">
            {" "}
            · review with ✓ / ✗ on each
          </span>
        </span>
        <Button
          size="sm"
          className="h-7 gap-1 rounded-full bg-success px-2.5 text-xs text-white hover:bg-success/90"
          disabled={busy !== null}
          onClick={() => void run("accept")}
        >
          {busy === "accept" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Accept all
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 rounded-full px-2.5 text-xs"
          disabled={busy !== null}
          onClick={() => void run("reject")}
        >
          {busy === "reject" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Reject all
        </Button>
      </div>
    )
  }
)

PredictionReviewBar.displayName = "PredictionReviewBar"
