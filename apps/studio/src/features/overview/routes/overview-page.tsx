import React from "react"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Cpu,
  Folder,
  FolderPlus,
  Images,
  Layers,
  RefreshCw,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Card } from "@/shared/ui/card"
import { useOverviewViewModel } from "@/features/overview/model/overview-viewmodel"
import {
  AiWorkspaceCard,
  DistributionCard,
  KpiRow,
  QuickActionsPanel,
  RecentProjects,
  type StatCardSpec,
} from "@/features/overview/components/overview-sections"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const Overview: React.FC = () => {
  const {
    stats,
    aiModels,
    training,
    recentProjects,
    quickActions,
    statusBreakdown,
    modalityBreakdown,
    isLoading,
    error,
    isEmpty,
    lastUpdated,
    refreshData,
    openProject,
  } = useOverviewViewModel()

  // KPI cards — every value is reliably populated; the 4th slot shows live
  // training when any job exists, otherwise weekly activity (never a fake 0).
  const kpiCards: StatCardSpec[] = [
    {
      title: "Projects",
      value: stats.totalProjects,
      icon: Folder,
      color: "bg-primary",
      subtext: `${stats.activeProjects} active · ${stats.completedProjects} completed`,
    },
    {
      title: "Total Items",
      value: stats.totalItems,
      icon: Images,
      color: "bg-chart-1",
      subtext: `across ${plural(stats.totalProjects, "project")}`,
    },
    {
      title: "Models Ready",
      value: `${aiModels.ready} / ${aiModels.installed}`,
      icon: Cpu,
      color: "bg-chart-2",
      subtext: aiModels.installed > 0 ? "ready for auto-label" : "none installed",
    },
    training.total > 0
      ? {
          title: "Training",
          value: training.running,
          icon: Activity,
          color: "bg-chart-3",
          subtext:
            training.activeProgress != null
              ? `${training.activeProgress}% on active job`
              : `${plural(training.total, "job")} total`,
        }
      : {
          title: "Updated This Week",
          value: stats.updatedThisWeek,
          icon: TrendingUp,
          color: "bg-chart-3",
        },
  ]

  // Cold-start failure with nothing to show — surface the error full-width.
  if (error && isEmpty && !isLoading) {
    return (
      <div className="min-h-screen p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {error instanceof Error ? error.message : String(error)}
            </span>
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-6 bg-background p-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your labeling workspace at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Non-blocking error (we still have cached data to show) */}
      {!!error && !isEmpty && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Couldn't refresh — showing the last loaded data.</span>
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isEmpty && !isLoading ? (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Folder className="h-16 w-16 text-muted-foreground opacity-50" />
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Welcome to Vailabel Studio
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Create a project, import your images, and define label classes to
              start annotating.
            </p>
          </div>
          <Button onClick={quickActions[0]?.action} size="lg">
            <FolderPlus className="mr-2 h-5 w-5" />
            Create your first project
          </Button>
        </Card>
      ) : (
        <>
          <KpiRow cards={kpiCards} isLoading={isLoading} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <RecentProjects
              projects={recentProjects}
              isLoading={isLoading}
              now={lastUpdated.getTime()}
              onOpen={openProject}
            />
            <div className="space-y-6">
              <QuickActionsPanel actions={quickActions} />
              <AiWorkspaceCard
                models={aiModels}
                training={training}
                onManage={quickActions.find((a) => a.id === "ai-models")?.action ?? (() => {})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DistributionCard
              title="Projects by status"
              icon={BarChart3}
              entries={statusBreakdown}
              isLoading={isLoading}
              byStatus
            />
            <DistributionCard
              title="Projects by modality"
              icon={Layers}
              entries={modalityBreakdown}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default Overview
