import type * as React from "react"
import { useState } from "react"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/shared/ui/item"
import { cn } from "@/shared/lib/utils"
import { toneChip, type Tone } from "./tone"
import type { IssueItem } from "@/features/dataset-intelligence/model/issue-items"

/** Rows shown before the list collapses. */
const COLLAPSED_COUNT = 8
/** Hard cap on rendered rows — issue lists can run to tens of thousands. */
const MAX_RENDERED = 500

function IssueRow({ item, className }: { item: IssueItem; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-border px-3 py-2",
        className
      )}
    >
      <span className="truncate text-sm text-foreground">{item.primary}</span>
      {item.secondary && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {item.secondary}
        </span>
      )}
    </div>
  )
}

/**
 * One category of findings: a tone-accented header with a count, then the
 * matching rows. Beyond `COLLAPSED_COUNT` the remainder collapses behind a
 * show more/less toggle.
 */
export function IssueSection({
  icon: Icon,
  tone,
  title,
  subtitle,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: Tone
  title: string
  subtitle: string
  items: IssueItem[]
}) {
  const [expanded, setExpanded] = useState(false)

  const head = items.slice(0, COLLAPSED_COUNT)
  const rest = items.slice(COLLAPSED_COUNT, MAX_RENDERED)

  return (
    <Card size="sm">
      <CardHeader>
        <Item size="sm" className="p-0">
          <ItemMedia variant="icon" className={toneChip(tone)}>
            <Icon className="size-4" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="font-semibold">
              {title}
              <Badge
                variant={items.length === 0 ? "secondary" : "default"}
                className="tabular-nums"
              >
                {items.length}
              </Badge>
            </ItemTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </ItemContent>
        </Item>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="pl-1 text-sm text-muted-foreground">No issues found.</p>
        ) : (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <div className="overflow-hidden rounded-md border border-border">
              {head.map((item, index) => (
                <IssueRow
                  key={index}
                  item={item}
                  className={index === 0 ? undefined : "border-t"}
                />
              ))}
              {rest.length > 0 && (
                <CollapsibleContent>
                  {rest.map((item, index) => (
                    <IssueRow key={index} item={item} className="border-t" />
                  ))}
                </CollapsibleContent>
              )}
            </div>
            {rest.length > 0 && (
              <CollapsibleTrigger
                render={
                  <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs" />
                }
              >
                {expanded ? "Show less" : `Show ${rest.length} more`}
              </CollapsibleTrigger>
            )}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
