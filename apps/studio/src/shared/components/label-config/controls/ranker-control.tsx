import { memo, useMemo } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { rankerValue } from "@/shared/lib/label-config/result"
import { Field } from "./field"
import { controlTitle, humanizeName } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Order the bound objects (search results, candidate documents) from best to
// worst. The candidates are the control's `toNames`; the ranking is stored as
// `{ ranker: [name, …] }`, best first. Nothing is stored until the annotator
// moves something — an untouched ranker is "not answered", not "default order".
export const RankerControl = memo(({ control, api }: ControlWidgetProps) => {
  const stored = api.valueFor(control.name)?.ranker as string[] | undefined

  // Stored order first, then any bound objects it doesn't mention yet (the
  // config gained a candidate after this item was ranked).
  const order = useMemo(() => {
    const known = new Set(control.toNames)
    const ranked = (stored ?? []).filter((name) => known.has(name))
    return [
      ...ranked,
      ...control.toNames.filter((name) => !ranked.includes(name)),
    ]
  }, [stored, control.toNames])

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    api.onSet(control, rankerValue(next))
  }

  return (
    <Field
      title={controlTitle(control)}
      hint={stored ? undefined : "not ranked yet"}
    >
      <ol className="flex flex-col gap-1.5">
        {order.map((name, index) => {
          const label = humanizeName(name)
          return (
            <li
              key={name}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${label} up`}
                className="rounded p-1 hover:bg-muted disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`Move ${label} down`}
                className="rounded p-1 hover:bg-muted disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ol>
      {stored && (
        <button
          type="button"
          onClick={() => api.onClear(control)}
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear ranking
        </button>
      )}
    </Field>
  )
})

RankerControl.displayName = "RankerControl"
