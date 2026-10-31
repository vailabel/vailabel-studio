import { memo, useMemo } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { rankerValue } from "@/shared/lib/label-config/result"
import { Field } from "./field"
import { controlTitle, humanizeName } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Order the bound objects (search results, candidate documents) from best to
// worst. The candidates are the control's `toNames`, stored as
// `{ ranker: [name, …] }` — or, when the ranker targets a List object, the
// list's entries, stored Label Studio-style as `{ ranker: { [list]: [id, …] } }`.
// Best first. Nothing is stored until the annotator moves something — an
// untouched ranker is "not answered", not "default order".
export const RankerControl = memo(({ control, api }: ControlWidgetProps) => {
  const list = api.rankItems?.(control)
  const raw = api.valueFor(control.name)?.ranker
  const stored = (list ? (raw as Record<string, string[]> | undefined)?.[list.bucket] : raw) as
    | string[]
    | undefined

  const candidates = useMemo(
    () =>
      list
        ? list.items
        : control.toNames.map((name) => ({ id: name, label: humanizeName(name), detail: undefined })),
    [list, control.toNames]
  )

  // Stored order first, then any candidates it doesn't mention yet (the
  // config or list gained a candidate after this item was ranked).
  const order = useMemo(() => {
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    const ranked = (stored ?? []).filter((id) => byId.has(id))
    return [
      ...ranked.map((id) => byId.get(id)!),
      ...candidates.filter((candidate) => !ranked.includes(candidate.id)),
    ]
  }, [stored, candidates])

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = order.map((candidate) => candidate.id)
    ;[next[index], next[target]] = [next[target], next[index]]
    api.onSet(control, list ? { ranker: { [list.bucket]: next } } : rankerValue(next))
  }

  return (
    <Field
      title={controlTitle(control)}
      hint={stored ? undefined : "not ranked yet"}
    >
      <ol className="flex flex-col gap-1.5">
        {order.map(({ id, label, detail }, index) => {
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{label}</span>
                {detail && (
                  <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                )}
              </span>
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
