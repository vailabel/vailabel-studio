import { useMemo, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import type { AIModel } from "@/types/core"
import {
  canAttemptModelPrediction,
  isDetectionModel,
} from "@/lib/ai-model-metadata"
import { services } from "@/services"

interface AutoLabelControlsProps {
  /** All installed models; filtered here to auto-label-capable detectors. */
  models: AIModel[]
  isRunning: boolean
  /** Run the chosen detection model on the current image at the given
   * confidence threshold (0–1). */
  onAutoLabel: (modelId: string, threshold: number) => Promise<unknown>
}

/**
 * Compact, tool-style auto-labeling control: a dropdown of the *detection*
 * models that can actually run (no segmentation/classification clutter) plus an
 * "Auto-label" button that runs the picked model on the current image. Picking a
 * model also makes it the active detector, so the choice sticks everywhere.
 */
export function AutoLabelControls({
  models,
  isRunning,
  onAutoLabel,
}: AutoLabelControlsProps) {
  const navigate = useNavigate()

  // Only models usable for auto-labeling: detection role + prediction-ready
  // (or convertible). Keeps the picker short and unambiguous.
  const detectors = useMemo(
    () =>
      models.filter(
        (model) => isDetectionModel(model) && canAttemptModelPrediction(model)
      ),
    [models]
  )

  const activeId = useMemo(
    () => detectors.find((model) => model.isActive)?.id,
    [detectors]
  )
  const [selectedId, setSelectedId] = useState<string>("")
  const effectiveId = selectedId || activeId || detectors[0]?.id || ""

  // Confidence threshold (percent) for detections. Default 25% matches the
  // runtime default; lower it to surface boxes from a weaker model, raise it to
  // keep only confident ones.
  const [confPct, setConfPct] = useState(25)

  if (detectors.length === 0) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        onClick={() => navigate("/ai-models")}
        title="No detection model installed — install one to auto-label"
      >
        <Sparkles className="h-4 w-4" />
        Install a model
      </Button>
    )
  }

  const handleSelect = async (id: string) => {
    setSelectedId(id)
    // Make the picked model the active detector so the choice persists.
    try {
      await services.getAIModelService().setActive(id)
    } catch {
      // Non-fatal — the run still uses the selected id below.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={effectiveId}
        onChange={(event) => void handleSelect(event.target.value)}
        disabled={isRunning}
        className="h-8 max-w-[10rem] truncate rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        title="Detection model used for auto-labeling"
      >
        {detectors.map((model) => (
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
