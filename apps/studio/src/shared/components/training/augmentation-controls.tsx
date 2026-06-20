import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { Label } from "@/shared/ui/label"
import { Slider } from "@/shared/ui/slider"
import { Switch } from "@/shared/ui/switch"
import {
  AUG_PRESETS,
  pctText,
  type AugKey,
  type Augmentation,
} from "@/shared/components/training/training-config"

function AugSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="font-normal">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  )
}

/**
 * Roboflow-style augmentation controls: a preset picker plus a collapsible set
 * of per-knob flips/sliders. Stateless — the parent owns the augmentation state
 * (so it can also drive a live preview). Used by the training dialog and the
 * full training page.
 */
export function AugmentationControls({
  aug,
  augPreset,
  onPreset,
  onField,
  defaultOpen = false,
}: {
  aug: Augmentation
  augPreset: AugKey | "custom"
  onPreset: (key: AugKey) => void
  onField: (field: keyof Augmentation, value: number) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const hint =
    augPreset === "custom"
      ? "Custom — tuned below. Applied on the fly during training (no extra disk)."
      : `${AUG_PRESETS[augPreset].hint} Applied on the fly during training (no extra disk).`

  return (
    <div className="space-y-2">
      <Select
        value={augPreset}
        onValueChange={(v) =>
          v !== null && v !== "custom" && onPreset(v as AugKey)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(AUG_PRESETS) as AugKey[]).map((key) => (
            <SelectItem key={key} value={key}>
              {AUG_PRESETS[key].label}
            </SelectItem>
          ))}
          {augPreset === "custom" && (
            <SelectItem value="custom">Custom</SelectItem>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{hint}</p>

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? "Hide augmentation settings" : "Customize augmentation"}
      </button>

      {open && (
        <div className="mt-2 space-y-4 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Horizontal flip</Label>
              <Switch
                checked={aug.fliplr > 0}
                onCheckedChange={(c) => onField("fliplr", c ? 0.5 : 0)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Vertical flip</Label>
              <Switch
                checked={aug.flipud > 0}
                onCheckedChange={(c) => onField("flipud", c ? 0.5 : 0)}
              />
            </div>
          </div>
          <AugSlider
            label="Rotation"
            value={aug.degrees}
            min={0}
            max={45}
            step={1}
            format={(v) => `±${Math.round(v)}°`}
            onChange={(v) => onField("degrees", v)}
          />
          <AugSlider
            label="Zoom"
            value={aug.scale}
            min={0}
            max={0.9}
            step={0.05}
            format={pctText}
            onChange={(v) => onField("scale", v)}
          />
          <AugSlider
            label="Hue"
            value={aug.hsv_h}
            min={0}
            max={0.1}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(v) => onField("hsv_h", v)}
          />
          <AugSlider
            label="Saturation"
            value={aug.hsv_s}
            min={0}
            max={1}
            step={0.05}
            format={pctText}
            onChange={(v) => onField("hsv_s", v)}
          />
          <AugSlider
            label="Brightness"
            value={aug.hsv_v}
            min={0}
            max={1}
            step={0.05}
            format={pctText}
            onChange={(v) => onField("hsv_v", v)}
          />
          <AugSlider
            label="Mosaic"
            value={aug.mosaic}
            min={0}
            max={1}
            step={0.05}
            format={pctText}
            onChange={(v) => onField("mosaic", v)}
          />
          <AugSlider
            label="Mixup"
            value={aug.mixup}
            min={0}
            max={1}
            step={0.05}
            format={pctText}
            onChange={(v) => onField("mixup", v)}
          />
        </div>
      )}
    </div>
  )
}
