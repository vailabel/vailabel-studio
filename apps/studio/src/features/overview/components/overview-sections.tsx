import React from "react"
import {
  Activity,
  Cpu,
  Folder,
  FolderPlus,
  Layers,
  LucideIcon,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import {
  QuickActionButton,
  RecentProjectRow,
  RecentProjectRowSkeleton,
  StatCard,
} from "@/features/overview/components/overview-components"
import type {
  DistributionEntry,
  useOverviewViewModel,
} from "@/features/overview/model/overview-viewmodel"

type OverviewViewModel = ReturnType<typeof useOverviewViewModel>

// ── KPI row (prop-driven) ─────────────────────────────────────────────────────

export interface StatCardSpec {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
  subtext?: string
}

export const KpiRow: React.FC<{ cards: StatCardSpec[]; isLoading: boolean }> = ({
  cards,
  isLoading,
}) => (
  <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    {cards.map((card) => (
      <StatCard key={card.title} {...card} isLoading={isLoading} />
    ))}
  </section>
)

// ── Recent projects (real, clickable) ─────────────────────────────────────────

export const RecentProjects: React.FC<{
  projects: OverviewViewModel["recentProjects"]
  isLoading: boolean
  now: number
  onOpen: (project: OverviewViewModel["recentProjects"][number]) => void
}> = ({ projects, isLoading, now, onOpen }) => (
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-foreground">
        <Activity className="h-5 w-5 text-primary" />
        Recent projects
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <RecentProjectRowSkeleton key={index} />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="space-y-0.5">
          {projects.map((project) => (
            <RecentProjectRow
              key={project.id}
              project={project}
              now={now}
              onOpen={() => onOpen(project)}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Folder className="mx-auto mb-3 h-10 w-10 opacity-50" />
          No projects yet.
        </div>
      )}
    </CardContent>
  </Card>
)

// ── Distribution bars (status / modality) ─────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "bg-info",
  completed: "bg-success",
  draft: "bg-warning",
  archived: "bg-muted-foreground",
  unknown: "bg-muted-foreground",
}

const CHART_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
]

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1)

export const DistributionCard: React.FC<{
  title: string
  icon: LucideIcon
  entries: DistributionEntry[]
  isLoading: boolean
  /** Color by status name; falls back to a rotating chart palette. */
  byStatus?: boolean
}> = ({ title, icon: Icon, entries, isLoading, byStatus = false }) => {
  const colorFor = (label: string, index: number) =>
    byStatus
      ? STATUS_COLORS[label.toLowerCase()] ?? "bg-primary"
      : CHART_COLORS[index % CHART_COLORS.length]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        colorFor(entry.label, index)
                      )}
                    />
                    <span className="text-sm capitalize text-foreground">
                      {titleCase(entry.label)}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {entry.count} ({entry.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", colorFor(entry.label, index))}
                    style={{ width: `${entry.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Folder className="mx-auto mb-3 h-10 w-10 opacity-50" />
            No data yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── AI workspace ──────────────────────────────────────────────────────────────

export const AiWorkspaceCard: React.FC<{
  models: OverviewViewModel["aiModels"]
  training: OverviewViewModel["training"]
  onManage: () => void
}> = ({ models, training, onManage }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-foreground">
        <Sparkles className="h-5 w-5 text-primary" />
        AI workspace
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Cpu className="h-4 w-4" /> Models ready
        </span>
        <span className="font-medium tabular-nums text-foreground">
          {models.ready}
          <span className="text-muted-foreground"> / {models.installed}</span>
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" /> Training
        </span>
        <span className="font-medium text-foreground">
          {training.running > 0 ? (
            <Badge variant="default">
              {training.running} running
              {training.activeProgress != null
                ? ` · ${training.activeProgress}%`
                : ""}
            </Badge>
          ) : (
            <span className="text-muted-foreground">idle</span>
          )}
        </span>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={onManage}>
        Manage AI models
      </Button>
    </CardContent>
  </Card>
)

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTION_ICONS: Record<string, LucideIcon> = {
  plus: FolderPlus,
  folder: Folder,
  cpu: Cpu,
  tag: Tag,
  layers: Layers,
}

export const QuickActionsPanel: React.FC<{
  actions: OverviewViewModel["quickActions"]
}> = ({ actions }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-foreground">
        <Zap className="h-5 w-5 text-primary" />
        Quick actions
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {actions.map((action) => (
        <QuickActionButton
          key={action.id}
          label={action.label}
          description={action.description}
          icon={QUICK_ACTION_ICONS[action.icon] ?? FolderPlus}
          onClick={action.action}
        />
      ))}
    </CardContent>
  </Card>
)
