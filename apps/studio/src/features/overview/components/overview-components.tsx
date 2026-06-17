import React from "react"
import { ChevronRight, Images, LucideIcon } from "lucide-react"
import { Card } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import type { Project } from "@/shared/types/core"

// Relative "Nm/Nh/Nd ago" used by the recent-projects rows. `now` is passed in
// (from the dashboard's last-refresh time) so this stays pure during render.
export const relativeTime = (date: Date, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / 1440)}d ago`
}

// ── KPI stat card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  /** A semantic tint class for the icon chip, e.g. "bg-primary". */
  color: string
  subtext?: string
  isLoading?: boolean
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  subtext,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3.5 w-24" />
            <Skeleton className="h-7 w-14" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className={cn("rounded-lg p-2.5 text-white", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {value}
          </p>
          {subtext ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtext}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

// ── Quick action ──────────────────────────────────────────────────────────────

interface QuickActionButtonProps {
  label: string
  description: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  label,
  description,
  icon: Icon,
  onClick,
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
  >
    <div className="rounded-md bg-primary/10 p-2 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <p className="truncate text-xs text-muted-foreground">{description}</p>
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  </button>
)

// ── Recent project row ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  active: "default",
  completed: "secondary",
  draft: "outline",
  archived: "outline",
}

export const RecentProjectRow: React.FC<{
  project: Project
  now: number
  onOpen: () => void
}> = ({ project, now, onOpen }) => {
  const updated = new Date(project.updatedAt ?? project.createdAt ?? now)
  const kind = project.modality || project.type
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {project.name}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={STATUS_BADGE[project.status] ?? "outline"}>
            {project.status || "unknown"}
          </Badge>
          {kind ? <span className="truncate capitalize">{kind}</span> : null}
          <span className="flex items-center gap-1 tabular-nums">
            <Images className="h-3 w-3" />
            {Number(project.imageCount ?? 0)}
          </span>
        </div>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {relativeTime(updated, now)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

export const RecentProjectRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-2 py-2">
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-3 w-12" />
  </div>
)
