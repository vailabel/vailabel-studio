import { Activity, Trash2 } from "lucide-react"
import type { ReportSummary } from "@/shared/types/dataset-intelligence"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/shared/ui/item"
import { cn } from "@/shared/lib/utils"
import { InlineNote } from "./dataset-states"

export function ReportsTab({
  reports,
  activeReportId,
  onSelect,
  onDelete,
}: {
  reports: ReportSummary[]
  activeReportId?: string
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (reports.length === 0) {
    return <InlineNote text="No saved reports yet." />
  }

  return (
    <ItemGroup className="gap-2">
      {reports.map((summary) => {
        const isActive = activeReportId === summary.id
        return (
          <Item
            key={summary.id}
            variant="outline"
            size="sm"
            className={cn(isActive && "border-primary/50 bg-primary/5")}
          >
            <ItemMedia variant="icon" className="rounded-md bg-muted p-2">
              <Activity className="size-4 text-foreground" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{new Date(summary.createdAt).toLocaleString()}</ItemTitle>
              <ItemDescription className="text-xs">
                {summary.itemCount} images · {summary.annotationCount} annotations ·
                health {summary.health.score.toFixed(0)}/100
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant="secondary" className="tabular-nums">
                {summary.health.errors}E / {summary.health.warnings}W
              </Badge>
              {!isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(summary.id)}
                >
                  View
                </Button>
              )}
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label="Delete report"
                onClick={() => onDelete(summary.id)}
              >
                <Trash2 />
              </Button>
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
