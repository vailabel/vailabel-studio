import { memo, useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select"
import { Slider } from "@/shared/ui/slider"

export interface DetectorChoice {
  id: string
  name: string
}

interface AutoLabelButtonProps {
  models: DetectorChoice[]
  isRunning: boolean
  disabled?: boolean
  onRun: (modelId: string, threshold: number) => void | Promise<void>
}

const MODEL_KEY = "studio.autoLabel.model"
const THRESHOLD_KEY = "studio.autoLabel.threshold"
const DEFAULT_THRESHOLD = 40

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable — the choice just isn't remembered.
  }
}

/**
 * One-click AI pre-labeling for the open image: run an object detector and drop
 * its boxes on the canvas as suggestions. Nothing is saved until the user
 * accepts them (✓/✗ per box, or Accept all), so it's safe to try. The model and
 * confidence are remembered between images.
 */
export const AutoLabelButton = memo(
  ({ models, isRunning, disabled, onRun }: AutoLabelButtonProps) => {
    const [open, setOpen] = useState(false)
    const [modelId, setModelId] = useState(() => read(MODEL_KEY) ?? "")
    const [threshold, setThreshold] = useState(() => {
      const stored = Number(read(THRESHOLD_KEY))
      return Number.isFinite(stored) && stored >= 5 && stored <= 95
        ? stored
        : DEFAULT_THRESHOLD
    })

    // Fall back to the first detector when nothing (valid) is remembered.
    useEffect(() => {
      if (models.length && !models.some((model) => model.id === modelId)) {
        setModelId(models[0].id)
      }
    }, [models, modelId])

    const run = () => {
      if (!modelId) return
      write(MODEL_KEY, modelId)
      write(THRESHOLD_KEY, String(threshold))
      setOpen(false)
      void onRun(modelId, threshold / 100)
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled || isRunning}
          render={
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-success/40 text-success hover:bg-success/10 hover:text-success"
              title="Let AI draw suggested boxes on this image"
            >
              {isRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              <span className="hidden sm:inline">
                {isRunning ? "Labeling…" : "Auto-label"}
              </span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-80 gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-success" />
              Auto-label this image
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AI draws suggested boxes. Review each with <strong>✓ / ✗</strong>{" "}
              on the canvas, or accept them all at once — nothing is saved until
              you do.
            </p>
          </div>

          {models.length === 0 ? (
            <p className="rounded-md bg-muted px-2 py-2 text-xs text-muted-foreground">
              No detection model is available yet. Add one on the AI Assistant
              page, or ask the Copilot tab to detect objects.
            </p>
          ) : (
            <>
              <label className="space-y-1 text-xs font-medium">
                <span>Model</span>
                <NativeSelect
                  size="sm"
                  className="w-full"
                  value={modelId}
                  onChange={(event) => setModelId(event.target.value)}
                >
                  {models.map((model) => (
                    <NativeSelectOption key={model.id} value={model.id}>
                      {model.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Minimum confidence</span>
                  <span className="tabular-nums text-muted-foreground">
                    {threshold}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={95}
                  step={5}
                  value={[threshold]}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value
                    if (typeof next === "number") setThreshold(next)
                  }}
                  aria-label="Minimum confidence"
                />
                <p className="text-[11px] text-muted-foreground">
                  Lower finds more objects (with more mistakes); higher keeps
                  only sure ones.
                </p>
              </div>

              <Button size="sm" onClick={run} disabled={!modelId || isRunning}>
                <Sparkles className="size-4" />
                Run auto-label
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>
    )
  }
)

AutoLabelButton.displayName = "AutoLabelButton"
