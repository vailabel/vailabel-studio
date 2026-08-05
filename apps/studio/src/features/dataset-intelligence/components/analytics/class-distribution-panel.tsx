import type { ClassCount } from "@/shared/types/dataset-intelligence"
import { Panel } from "../panel"
import { InlineNote } from "../dataset-states"
import { DistributionBar } from "./distribution-bar"

/** Classes charted before the rest are summarised as a "+N more" line. */
const VISIBLE_CLASSES = 14

const DEFAULT_COLOR = "#6366f1"

export function ClassDistributionPanel({
  classDistribution,
}: {
  classDistribution: ClassCount[]
}) {
  const max = Math.max(1, ...classDistribution.map((entry) => entry.count))
  const visible = classDistribution.slice(0, VISIBLE_CLASSES)
  const hidden = classDistribution.length - visible.length

  return (
    <Panel title="Class distribution" subtitle="Annotations per class">
      {classDistribution.length === 0 ? (
        <InlineNote text="No annotations to distribute." />
      ) : (
        <div className="space-y-2.5">
          {visible.map((entry) => (
            <DistributionBar
              key={entry.label}
              label={entry.label}
              color={entry.color || DEFAULT_COLOR}
              count={entry.count}
              percentage={entry.percentage}
              max={max}
            />
          ))}
          {hidden > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              +{hidden} more classes
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
