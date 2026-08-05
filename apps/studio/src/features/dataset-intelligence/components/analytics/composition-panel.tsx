import type { AspectBucket, TypeCount } from "@/shared/types/dataset-intelligence"
import { Badge } from "@/shared/ui/badge"
import { Panel } from "../panel"
import { InlineNote } from "../dataset-states"

function BadgeRow({
  title,
  entries,
}: {
  title: string
  entries: Array<{ key: string; text: string }>
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {entries.length === 0 ? (
          <InlineNote text="None" />
        ) : (
          entries.map((entry) => (
            <Badge key={entry.key} variant="secondary">
              {entry.text}
            </Badge>
          ))
        )}
      </div>
    </div>
  )
}

export function CompositionPanel({
  annotationTypes,
  aspectBuckets,
}: {
  annotationTypes: TypeCount[]
  aspectBuckets: AspectBucket[]
}) {
  return (
    <Panel title="Composition" subtitle="Annotation types & aspect ratios">
      <div className="space-y-4">
        <BadgeRow
          title="Annotation types"
          entries={annotationTypes.map((entry) => ({
            key: entry.type,
            text: `${entry.type}: ${entry.count}`,
          }))}
        />
        <BadgeRow
          title="Aspect ratios"
          entries={aspectBuckets.map((bucket) => ({
            key: bucket.ratio,
            text: `${bucket.ratio}: ${bucket.count}`,
          }))}
        />
      </div>
    </Panel>
  )
}
