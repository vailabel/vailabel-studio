import { memo } from "react"
import { datetimeValue } from "@/shared/lib/label-config/result"
import { Field } from "./field"
import { controlTitle } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// A single date (or date + time when the control sets `only="date,time"` /
// `showtime="true"`), stored as the ISO-like string the native input produces.
export const DateTimeControl = memo(({ control, api }: ControlWidgetProps) => {
  const value =
    (api.valueFor(control.name)?.datetime as string | undefined) ?? ""
  const withTime =
    control.attrs.showtime === "true" || /time/.test(control.attrs.only ?? "")

  return (
    <Field title={controlTitle(control)}>
      <input
        type={withTime ? "datetime-local" : "date"}
        value={value}
        min={control.attrs.min}
        max={control.attrs.max}
        onChange={(event) =>
          event.target.value
            ? api.onSet(control, datetimeValue(event.target.value))
            : api.onClear(control)
        }
        className="w-56 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    </Field>
  )
})

DateTimeControl.displayName = "DateTimeControl"
