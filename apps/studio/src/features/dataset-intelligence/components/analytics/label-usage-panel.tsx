import type { LabelUsage } from "@/shared/types/dataset-intelligence"
import { Badge } from "@/shared/ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/shared/ui/item"
import { Panel } from "../panel"
import { InlineNote } from "../dataset-states"

export function LabelUsagePanel({ labels }: { labels: LabelUsage[] }) {
  return (
    <Panel title="Label usage" subtitle="Defined labels and their coverage">
      {labels.length === 0 ? (
        <InlineNote text="No labels defined." />
      ) : (
        <ItemGroup className="gap-0 divide-y divide-border">
          {labels.map((label) => (
            <Item key={label.id} size="xs" className="px-0">
              <ItemMedia>
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-normal">{label.name}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {label.annotationCount} ann · {label.itemCount} img
                </span>
                {!label.used && (
                  <Badge variant="secondary" className="text-[10px]">
                    unused
                  </Badge>
                )}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </Panel>
  )
}
