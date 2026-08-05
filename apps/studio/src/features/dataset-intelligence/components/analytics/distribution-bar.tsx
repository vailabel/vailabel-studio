import type * as React from "react"
import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress"

/** Minimum visible fill so a class with a single annotation is still legible. */
const MIN_FILL_PCT = 2

/**
 * One class in the distribution chart. The bar is sized relative to the
 * largest class (`max`), not to `percentage`, so small classes stay readable.
 * The class colour overrides the Progress indicator via a CSS variable.
 */
export function DistributionBar({
  label,
  color,
  count,
  percentage,
  max,
}: {
  label: string
  color: string
  count: number
  percentage: number
  max: number
}) {
  const fill = Math.max(MIN_FILL_PCT, (count / max) * 100)

  return (
    <Progress
      value={fill}
      style={{ "--bar-color": color } as React.CSSProperties}
      className="gap-y-1 [&_[data-slot=progress-indicator]]:bg-(--bar-color) [&_[data-slot=progress-track]]:h-2"
    >
      <ProgressLabel className="flex min-w-0 items-center gap-2 font-normal">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-foreground">{label}</span>
      </ProgressLabel>
      <ProgressValue className="shrink-0">
        {() => `${count} · ${percentage.toFixed(1)}%`}
      </ProgressValue>
    </Progress>
  )
}
