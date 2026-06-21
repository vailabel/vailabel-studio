import { memo } from "react"
import { Field } from "./field"
import { controlTitle, useSyncedDraft } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Free-text input. Stored as a string array (one entry per line) to match the
// Label Studio `textarea` result shape.
export const TextAreaControl = memo(({ control, api }: ControlWidgetProps) => {
  const value = api.valueFor(control.name)
  const text = ((value?.text as string[] | undefined) ?? []).join("\n")
  return (
    <Field title={controlTitle(control)}>
      <TextAreaInput
        value={text}
        onCommit={(next) =>
          next.trim() === ""
            ? api.onClear(control)
            : api.onSet(control, { text: next.split("\n") })
        }
      />
    </Field>
  )
})

TextAreaControl.displayName = "TextAreaControl"

const TextAreaInput = memo(
  ({ value, onCommit }: { value: string; onCommit: (text: string) => void }) => {
    const [draft, setDraft] = useSyncedDraft(value)
    return (
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit(draft)
        }}
        rows={2}
        className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    )
  }
)

TextAreaInput.displayName = "TextAreaInput"
