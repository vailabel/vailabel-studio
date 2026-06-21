import { memo } from "react"
import { cn } from "@/shared/lib/utils"
import { Field } from "./field"
import { controlTitle } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// A/B preference: pick the better of the two compared objects, or a tie. The two
// sides come from the control's `toNames` (left, right); the choice is stored as
// `{ selected: "left" | "tie" | "right" }`.
export const PairwiseControl = memo(({ control, api }: ControlWidgetProps) => {
  const value = api.valueFor(control.name)
  const [left, right] = control.toNames.length >= 2 ? control.toNames : ["A", "B"]
  const selected = value?.selected as string | undefined
  const options = [
    { key: "left", label: `◀ ${humanize(left)}` },
    { key: "tie", label: "Tie" },
    { key: "right", label: `${humanize(right)} ▶` },
  ]

  return (
    <Field title={controlTitle(control)} hint="pick the better one">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                isSelected
                  ? api.onClear(control)
                  : api.onSet(control, { selected: option.key })
              }
              className={cn(
                "inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary font-medium text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
})

PairwiseControl.displayName = "PairwiseControl"

/** "response_a" → "Response A" for side labels derived from field names. */
function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}
