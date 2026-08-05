import type * as React from "react"
import { Trash2 } from "lucide-react"
import type { Label } from "@/shared/types/core"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Progress } from "@/shared/ui/progress"

/**
 * One annotation class: swatch, name, count, delete, and a bar sized against
 * the most-used class so the relative distribution is visible at a glance.
 */
export function ClassCard({
  label,
  count,
  maxCount,
  onDelete,
  isDeleting,
}: {
  label: Label
  count: number
  maxCount: number
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
            style={{ backgroundColor: label.color }}
          />
          <span className="min-w-0 flex-1 truncate font-medium">{label.name}</span>
          <Badge variant="secondary" className="tabular-nums">
            {count}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${label.name}`}
          >
            <Trash2 />
          </Button>
        </div>
        <Progress
          value={Math.round((count / maxCount) * 100)}
          aria-label={`${label.name} share of annotations`}
          style={{ "--class-color": label.color } as React.CSSProperties}
          className="[&_[data-slot=progress-indicator]]:bg-(--class-color)"
        />
      </CardContent>
    </Card>
  )
}
