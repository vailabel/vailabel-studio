import { memo } from "react"
import { Star } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Field } from "./field"
import { controlTitle } from "./control-helpers"
import type { ControlWidgetProps } from "./types"

// Star rating; `maxrating` attr controls the number of stars (default 5).
export const RatingControl = memo(({ control, api }: ControlWidgetProps) => {
  const value = api.valueFor(control.name)
  const max = Number(control.attrs.maxrating ?? control.attrs.maxRating ?? 5)
  const current = Number(value?.rating ?? 0)

  return (
    <Field title={controlTitle(control)}>
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
})

RatingControl.displayName = "RatingControl"
