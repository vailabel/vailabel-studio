import { memo } from "react"
import type { ControlTag } from "@/shared/lib/label-config/types"
import { controlWidgetFor } from "./controls/control-registry"
import type { ControlValueApi } from "./controls/types"

export type { ControlValueApi } from "./controls/types"

// Whole-item controls (choices, taxonomy, rating, textarea, number, pairwise)
// rendered from the config. Each tag resolves to a widget through the control
// registry, so adding a control type never touches this dispatcher. Each widget
// maps to exactly one stored result, keyed by the control name.
export const StandaloneControls = memo(
  ({ controls, api }: { controls: ControlTag[]; api: ControlValueApi }) => {
    if (controls.length === 0) return null
    return (
      <div className="flex max-h-72 shrink-0 flex-col gap-3 overflow-auto border-t border-border bg-card p-4">
        {controls.map((control) => {
          const Widget = controlWidgetFor(control.tag)
          return <Widget key={control.name} control={control} api={api} />
        })}
      </div>
    )
  }
)

StandaloneControls.displayName = "StandaloneControls"
