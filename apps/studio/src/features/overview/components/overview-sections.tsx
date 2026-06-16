import React from "react"
import {
  Activity,
  BarChart3,
  CheckSquare,
  Folder,
  FolderPlus,
  Image,
  LucideIcon,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import {
  StatCard,
  QuickActionCard,
  ActivityItem,
  ActivitySkeleton,
} from "@/features/overview/components/overview-components"
import type { useOverviewViewModel } from "@/features/overview/model/overview-viewmodel"

type OverviewViewModel = ReturnType<typeof useOverviewViewModel>

// ── Statistics grid (all values derived from real project data) ───────────────

export const StatGrid: React.FC<{
  stats: OverviewViewModel["stats"]
  isLoading: boolean
}> = ({ stats, isLoading }) => {
  const cards: Array<{
    title: string
    value: number | string
    icon: LucideIcon
    color: string
  }> = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: Folder,
      color: "bg-primary",
    },
    {
      title: "Active Projects",
      value: stats.activeProjects,
      icon: Activity,
      color: "bg-chart-1",
    },
    {
      title: "Completed",
      value: stats.completedProjects,
      icon: CheckSquare,
      color: "bg-chart-2",
    },
    {
      title: "Images Labeled",
      value: stats.totalAnnotations,
      icon: Image,
      color: "bg-chart-3",
    },
    {
      title: "Label Classes",
      value: stats.labelsCreated,
      icon: Tag,
      color: "bg-chart-4",
    },
    {
      title: "Updated This Week",
      value: stats.recentProjects,
      icon: TrendingUp,
      color: "bg-chart-5",
    },
  ]

  return (
    <section className="mb-12">
      <div className="flex items-center gap-4 mb-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold text-foreground">Statistics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {cards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            isLoading={isLoading}
          />
        ))}
      </div>
    </section>
  )
}

// ── Recent activity (most recently updated projects) ──────────────────────────

export const RecentActivity: React.FC<{
  projects: OverviewViewModel["recentProjects"]
  isLoading: boolean
}> = ({ projects, isLoading }) => (
  <section className="lg:col-span-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ActivitySkeleton count={5} />
        ) : projects.length > 0 ? (
          <div className="space-y-2">
            {projects.map((project) => (
              <ActivityItem
                key={project.id}
                activity={`Updated project "${project.name}"`}
                user="System"
                date={
                  new Date(
                    project.updatedAt || project.createdAt || new Date()
                  )
                }
                type="project"
                projectName={project.name}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  </section>
)

// ── Projects by status (real distribution) ────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "bg-info",
  completed: "bg-success",
  draft: "bg-warning",
  archived: "bg-muted-foreground",
  unknown: "bg-muted-foreground",
}

const statusColor = (status: string) =>
  STATUS_COLORS[status.toLowerCase()] ?? "bg-primary"

const titleCase = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1)

export const ProjectStatusBreakdown: React.FC<{
  breakdown: OverviewViewModel["statusBreakdown"]
  isLoading: boolean
}> = ({ breakdown, isLoading }) => (
  <section>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          Projects by Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : breakdown.length > 0 ? (
          <div className="space-y-4">
            {breakdown.map((entry) => (
              <div key={entry.status} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${statusColor(
                        entry.status
                      )}`}
                    />
                    <span className="text-sm text-foreground">
                      {titleCase(entry.status)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {entry.count} ({entry.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColor(entry.status)}`}
                    style={{ width: `${entry.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No projects yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  </section>
)

// ── Quick actions ─────────────────────────────────────────────────────────────

// Keyed on the icon identifiers the view model actually emits.
const QUICK_ACTION_ICONS: Record<string, LucideIcon> = {
  plus: FolderPlus,
  folder: Folder,
  tag: Tag,
  users: Users,
  checkSquare: CheckSquare,
}

export const QuickActionsPanel: React.FC<{
  actions: OverviewViewModel["quickActions"]
}> = ({ actions }) => (
  <section>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action) => (
            <QuickActionCard
              key={action.id}
              label={action.label}
              description={action.description}
              icon={QUICK_ACTION_ICONS[action.icon] ?? FolderPlus}
              color={action.color}
              onClick={action.action}
              disabled={action.disabled}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  </section>
)
