import { Check, Sparkles, X } from "lucide-react"
import type { Prediction } from "@vailabel/core"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PredictionReviewPanelProps {
  predictions: Prediction[]
  onAccept: (predictionId: string) => Promise<void>
  onReject: (predictionId: string) => Promise<void>
}

export function PredictionReviewPanel({
  predictions,
  onAccept,
  onReject,
}: PredictionReviewPanelProps) {
  if (predictions.length === 0) return null

  return (
    <div className="absolute right-4 top-4 z-20 w-80 rounded-xl border border-emerald-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-emerald-900 dark:bg-gray-900/95">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Predictions</p>
          <p className="text-xs text-muted-foreground">
            Accept the suggestions you want to keep.
          </p>
        </div>
      </div>

      <ScrollArea className="max-h-72">
        <div className="space-y-3">
          {predictions.map((prediction) => (
            <div
              key={prediction.id}
              className="rounded-lg border border-border bg-background/70 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {prediction.labelName || prediction.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(prediction.confidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
                <div
                  className="h-3 w-3 rounded-full border border-white shadow"
                  style={{
                    backgroundColor:
                      prediction.labelColor || prediction.color || "#22c55e",
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => void onAccept(prediction.id)}
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
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
