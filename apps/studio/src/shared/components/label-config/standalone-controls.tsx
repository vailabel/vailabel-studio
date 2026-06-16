import { memo, useState } from "react"
import { Star } from "lucide-react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import type { ControlTag } from "@/shared/lib/label-config/types"
import { colorForChoice } from "@/shared/lib/label-config/config-helpers"

export interface ControlValueApi {
  /** Current stored value for a control (by name), or undefined. */
  valueFor: (controlName: string) => Record<string, unknown> | undefined
  onSet: (control: ControlTag, value: Record<string, unknown>) => void
  onClear: (control: ControlTag) => void
}

// Whole-item controls (choices, taxonomy, rating, textarea, number) rendered
// from the config. Each maps to exactly one stored result for its control.
export const StandaloneControls = memo(
  ({ controls, api }: { controls: ControlTag[]; api: ControlValueApi }) => {
    if (controls.length === 0) return null
    return (
      <div className="flex max-h-72 shrink-0 flex-col gap-3 overflow-auto border-t border-border bg-card p-4">
        {controls.map((control) => (
          <ControlWidget key={control.name} control={control} api={api} />
        ))}
      </div>
    )
  }
)

StandaloneControls.displayName = "StandaloneControls"

const ControlWidget = memo(
  ({ control, api }: { control: ControlTag; api: ControlValueApi }) => {
    const value = api.valueFor(control.name)
    const title = control.attrs.title || control.name

    if (control.tag === "choices" || control.tag === "taxonomy") {
      const multiple =
        control.tag === "taxonomy" || control.attrs.choice === "multiple"
      const selected =
        control.tag === "taxonomy"
          ? ((value?.taxonomy as string[][] | undefined)?.map((p) => p[0]) ?? [])
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
            control.tag === "taxonomy"
              ? { taxonomy: next.map((entry) => [entry]) }
              : { choices: next }
          )
        }
      }

      return (
        <Field title={title} hint={multiple ? "choose any" : undefined}>
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
    }

    if (control.tag === "rating") {
      const max = Number(control.attrs.maxrating ?? control.attrs.maxRating ?? 5)
      const current = Number(value?.rating ?? 0)
      return (
        <Field title={title}>
          <div className="flex gap-1">
            {Array.from({ length: max }, (_, index) => index + 1).map((star) => (
              <button
                key={star}
                type="button"
                onClick={() =>
                  star === current
                    ? api.onClear(control)
                    : api.onSet(control, { rating: star })
                }
                aria-label={`${star} of ${max}`}
              >
                <Star
                  className={cn(
                    "size-5",
                    star <= current
                      ? "fill-warning text-warning"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
        </Field>
      )
    }

    if (control.tag === "number") {
      return (
        <Field title={title}>
          <NumberInput
            value={value?.number as number | undefined}
            onCommit={(n) =>
              n == null ? api.onClear(control) : api.onSet(control, { number: n })
            }
          />
        </Field>
      )
    }

    if (control.tag === "textarea") {
      const text = ((value?.text as string[] | undefined) ?? []).join("\n")
      return (
        <Field title={title}>
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
    }

    return (
      <Field title={title}>
        <p className="text-xs text-muted-foreground">
          Control “{control.tag}” isn’t supported yet.
        </p>
      </Field>
    )
  }
)

ControlWidget.displayName = "ControlWidget"

const Field = ({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
      {hint && <span className="ml-1 lowercase opacity-70">({hint})</span>}
    </span>
    {children}
  </div>
)

// Reset a local draft when the source value changes (render-phase, no effect).
function useSyncedDraft<T>(value: T): [T, (next: T) => void] {
  const [draft, setDraft] = useState(value)
  const [previous, setPrevious] = useState(value)
  if (previous !== value) {
    setPrevious(value)
    setDraft(value)
  }
  return [draft, setDraft]
}

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
