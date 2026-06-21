import { memo } from "react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import { colorForChoice } from "@/shared/lib/label-config/config-helpers"
import { Field } from "./field"
import { controlTitle } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Choices (single / multiple) and Taxonomy share selection logic — taxonomy
// stores a list of paths, choices a flat list — so one widget renders both.
export const ChoicesControl = memo(({ control, api }: ControlWidgetProps) => {
  const value = api.valueFor(control.name)
  const isTaxonomy = control.tag === "taxonomy"
  const multiple = isTaxonomy || control.attrs.choice === "multiple"
  const selected = isTaxonomy
    ? ((value?.taxonomy as string[][] | undefined)?.map((path) => path[0]) ?? [])
    : ((value?.choices as string[] | undefined) ?? [])

  const toggle = (choice: string) => {
    const next = selected.includes(choice)
      ? selected.filter((entry) => entry !== choice)
      : multiple
        ? [...selected, choice]
        : [choice]
    if (next.length === 0) {
      api.onClear(control)
    } else {
      api.onSet(
        control,
        isTaxonomy
          ? { taxonomy: next.map((entry) => [entry]) }
          : { choices: next }
      )
    }
  }

  return (
    <Field title={controlTitle(control)} hint={multiple ? "choose any" : undefined}>
      <div className="flex flex-wrap gap-2">
        {control.choices.map((choice) => {
          const isSelected = selected.includes(choice.value)
          const color = colorForChoice(control, choice.value)
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => toggle(choice.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                isSelected
                  ? "border-transparent font-medium text-white"
                  : "hover:bg-muted"
              )}
              style={
                isSelected
                  ? { backgroundColor: color }
                  : { backgroundColor: rgbToRgba(color, 0.12), borderColor: color }
              }
            >
              {choice.value}
            </button>
          )
        })}
      </div>
    </Field>
  )
})

ChoicesControl.displayName = "ChoicesControl"
