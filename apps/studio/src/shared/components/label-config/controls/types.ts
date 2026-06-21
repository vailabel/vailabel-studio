import type { ControlTag } from "@/shared/lib/label-config/types"

/**
 * Read/write API for a single stored control value, injected into every widget.
 * Keeps the widgets presentational: the studio editor and the create-flow
 * preview each supply their own backing store (real annotations vs. ephemeral
 * local state).
 */
export interface ControlValueApi {
  /** Current stored value for a control (by name), or undefined. */
  valueFor: (controlName: string) => Record<string, unknown> | undefined
  onSet: (control: ControlTag, value: Record<string, unknown>) => void
  onClear: (control: ControlTag) => void
}

/** Props every whole-item control widget receives. */
export interface ControlWidgetProps {
  control: ControlTag
  api: ControlValueApi
}
