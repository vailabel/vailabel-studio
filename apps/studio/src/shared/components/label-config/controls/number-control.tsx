import { memo } from "react"
import { Field } from "./field"
import { controlTitle, useSyncedDraft } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Single numeric value.
export const NumberControl = memo(({ control, api }: ControlWidgetProps) => {
  const value = api.valueFor(control.name)
  return (
    <Field title={controlTitle(control)}>
      <NumberInput
        value={value?.number as number | undefined}
        onCommit={(next) =>
          next == null
            ? api.onClear(control)
            : api.onSet(control, { number: next })
        }
      />
    </Field>
  )
})

NumberControl.displayName = "NumberControl"

const NumberInput = memo(
  ({
    value,
    onCommit,
  }: {
    value?: number
    onCommit: (n: number | null) => void
  }) => {
    const [draft, setDraft] = useSyncedDraft(value?.toString() ?? "")
    return (
      <input
        type="number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          onCommit(trimmed === "" ? null : Number(trimmed))
        }}
        className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }
)

NumberInput.displayName = "NumberInput"
