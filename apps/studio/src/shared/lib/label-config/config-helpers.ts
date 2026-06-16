import type { Label } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"

// Fallback palette for choices/labels that don't declare a `background`.
const PALETTE = [
  "#ef4444",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#84cc16",
]

/** A config control's choices as `Label`-shaped objects, for reuse with the
 *  label menu / span renderer (id = value, color = background or palette). */
export function choicesToLabels(control: ControlTag): Label[] {
  return control.choices.map(
    (choice, index) =>
      ({
        id: choice.value,
        name: choice.value,
        color: choice.background || PALETTE[index % PALETTE.length],
      }) as Label
  )
}

/** Color for a specific choice value within a control. */
export function colorForChoice(control: ControlTag, value: string): string {
  const index = control.choices.findIndex((choice) => choice.value === value)
  if (index < 0) return "#64748b"
  return control.choices[index].background || PALETTE[index % PALETTE.length]
}

/** Spatial controls draw regions on an object; the rest are whole-item widgets. */
export const SPATIAL_CONTROL_TAGS = new Set([
  "rectanglelabels",
  "polygonlabels",
  "keypointlabels",
  "ellipselabels",
  "brushlabels",
  "labels",
  "hypertextlabels",
  "paragraphlabels",
  "timeserieslabels",
])

export function isSpatialControl(control: ControlTag): boolean {
  return SPATIAL_CONTROL_TAGS.has(control.tag)
}
