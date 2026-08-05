import type { ResolutionStats } from "@/shared/types/dataset-intelligence"
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/ui/item"
import { Panel } from "../panel"
import { InlineNote } from "../dataset-states"

/** Distinct resolutions listed before the tail is dropped. */
const VISIBLE_RESOLUTIONS = 6

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Item size="xs" variant="muted">
      <ItemContent>
        <ItemDescription className="text-xs">{label}</ItemDescription>
        <ItemTitle className="tabular-nums">{value}</ItemTitle>
      </ItemContent>
    </Item>
  )
}

export function ResolutionPanel({ stats }: { stats: ResolutionStats }) {
  return (
    <Panel title="Resolution" subtitle="Common image sizes">
      {stats.commonResolutions.length === 0 ? (
        <InlineNote text="No resolution data." />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Width" value={`${stats.minWidth}–${stats.maxWidth}`} />
            <MiniStat label="Height" value={`${stats.minHeight}–${stats.maxHeight}`} />
            <MiniStat
              label="Median"
              value={`${stats.medianWidth}×${stats.medianHeight}`}
            />
            <MiniStat label="Mean MP" value={stats.megapixelsMean.toFixed(2)} />
          </div>
          <div className="space-y-1.5 pt-1">
            {stats.commonResolutions.slice(0, VISIBLE_RESOLUTIONS).map((entry) => (
              <div
                key={`${entry.width}x${entry.height}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground tabular-nums">
                  {entry.width}×{entry.height}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {entry.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}
