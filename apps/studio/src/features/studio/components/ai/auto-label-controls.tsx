import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/shared/ui/button"
import type { DetectorOption } from "@/features/studio/model/image-labeler-viewmodel"

interface AutoLabelControlsProps {
  /** Detection models offered by the Python runtime catalog. */
  models: DetectorOption[]
  isRunning: boolean
  /** Run the chosen detection model on the current image at the given
   * confidence threshold (0–1). */
  onAutoLabel: (modelId: string, threshold: number) => Promise<unknown>
}

/**
 * Compact, tool-style auto-labeling control: a dropdown of the runtime's
 * detection models plus an "Auto-label" button that runs the picked model on the
 * current image. The runtime fetches a model's weights on first use, so there's
 * nothing to install up front.
 */
export function AutoLabelControls({
  models,
  isRunning,
  onAutoLabel,
}: AutoLabelControlsProps) {
  const navigate = useNavigate()

  const [selectedId, setSelectedId] = useState<string>("")
  const effectiveId = selectedId || models[0]?.id || ""

  // Confidence threshold (percent) for detections. Default 25% matches the
  // runtime default; lower it to surface boxes from a weaker model, raise it to
  // keep only confident ones.
  const [confPct, setConfPct] = useState(25)

  if (models.length === 0) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        onClick={() => navigate("/ai-models")}
        title="No detection model available — open the AI Assistant"
      >
        <Sparkles className="h-4 w-4" />
        AI models
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={effectiveId}
        onChange={(event) => setSelectedId(event.target.value)}
        disabled={isRunning}
        className="h-8 max-w-[10rem] truncate rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        title="Detection model used for auto-labeling"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      <label
        className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground"
        title="Confidence threshold — only keep detections at or above this score. Lower it if auto-label finds nothing."
      >
        Conf
        <input
          type="range"
          min={5}
          max={95}
          step={5}
          value={confPct}
          onChange={(event) => setConfPct(Number(event.target.value))}
          disabled={isRunning}
          className="h-1 w-16 cursor-pointer accent-primary"
        />
        <span className="w-8 tabular-nums text-foreground">{confPct}%</span>
      </label>
      <Button
        size="sm"
        className="h-8 gap-1.5"
        disabled={isRunning || !effectiveId}
        onClick={() => void onAutoLabel(effectiveId, confPct / 100)}
        title="Detect objects on this image with the selected model"
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Auto-label
      </Button>
    </div>
  )
}
