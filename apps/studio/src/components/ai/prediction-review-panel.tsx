import { useState } from "react"
import { Check, Sparkles, X } from "lucide-react"
import type { Label, Prediction } from "@/types/core"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface PredictionReviewPanelProps {
  predictions: Prediction[]
  labels: Label[]
  /** Accept a suggestion, optionally with a corrected label id (overrides the
   *  model's predicted label). */
  onAccept: (predictionId: string, labelId?: string) => Promise<void>
  onReject: (predictionId: string) => Promise<void>
  /** Shift left so the panel clears the docked copilot when it's open. */
  offset?: boolean
}

function willCreateLabel(prediction: Prediction, labels: Label[]) {
  if (prediction.labelId || prediction.label_id) {
    const labelId = prediction.labelId || prediction.label_id
    return !labels.some((label) => label.id === labelId)
  }

  const desiredName = prediction.labelName || prediction.label_name || prediction.name
  if (!desiredName) return false

  return !labels.some(
    (label) => label.name.toLowerCase() === desiredName.toLowerCase()
  )
}

export function PredictionReviewPanel({
  predictions,
  labels,
  onAccept,
  onReject,
  offset = false,
}: PredictionReviewPanelProps) {
  // Per-prediction label override; empty string = keep the model's prediction.
  const [chosen, setChosen] = useState<Record<string, string>>({})

  if (predictions.length === 0) return null

  return (
    <div
      className={cn(
        "absolute top-4 z-20 w-80 rounded-xl border border-emerald-200 bg-card/95 p-4 shadow-xl backdrop-blur dark:border-emerald-900/95",
        offset ? "right-[25rem]" : "right-4"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Predictions</p>
          <p className="text-xs text-muted-foreground">
            Pick a label, then accept the ones you want.
          </p>
        </div>
      </div>

      <ScrollArea className="max-h-72">
        <div className="space-y-3">
          {predictions.map((prediction) => {
            const overrideId = chosen[prediction.id] ?? ""
            const overrideLabel = overrideId
              ? labels.find((label) => label.id === overrideId)
              : undefined
            const displayName =
              overrideLabel?.name || prediction.labelName || prediction.name
            const displayColor =
              overrideLabel?.color ||
              prediction.labelColor ||
              prediction.color ||
              "#22c55e"
            const willCreate = !overrideLabel && willCreateLabel(prediction, labels)

            return (
              <div
                key={prediction.id}
                className="rounded-lg border border-border bg-background/70 p-3"
              >
                {willCreate && (
                  <p className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Accepting this will create a new project label.
                  </p>
                )}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(prediction.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                  <div
                    className="h-3 w-3 shrink-0 rounded-full border border-white shadow"
                    style={{ backgroundColor: displayColor }}
                  />
                </div>

                {labels.length > 0 && (
                  <select
                    value={overrideId}
                    onChange={(event) =>
                      setChosen((current) => ({
                        ...current,
                        [prediction.id]: event.target.value,
                      }))
                    }
                    className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    title="Change the label before accepting"
                  >
                    <option value="">
                      Keep: {prediction.labelName || prediction.name}
                    </option>
                    {labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      void onAccept(prediction.id, overrideId || undefined)
                    }
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => void onReject(prediction.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
