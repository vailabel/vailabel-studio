import type { ComponentType } from "react"
import type { ControlWidgetProps } from "./types"
import { ChoicesControl } from "./choices-control"
import { RatingControl } from "./rating-control"
import { NumberControl } from "./number-control"
import { TextAreaControl } from "./textarea-control"
import { PairwiseControl } from "./pairwise-control"
import { UnsupportedControl } from "./unsupported-control"

// Maps a whole-item control tag to the widget that renders it. Adding a control
// type is one widget file + one entry here (Open/Closed) — mirrors the studio's
// editor-registry and tool-registry. Spatial/region controls are handled by the
// per-object viewers, not this registry.
export const CONTROL_WIDGETS: Partial<
  Record<string, ComponentType<ControlWidgetProps>>
> = {
  choices: ChoicesControl,
  taxonomy: ChoicesControl,
  rating: RatingControl,
  number: NumberControl,
  textarea: TextAreaControl,
  pairwise: PairwiseControl,
}

/** The widget for a control tag, falling back to an "unsupported" notice. */
export function controlWidgetFor(
  tag: string
): ComponentType<ControlWidgetProps> {
  return CONTROL_WIDGETS[tag] ?? UnsupportedControl
}
