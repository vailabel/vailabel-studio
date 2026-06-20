import * as React from "react"
import { memo, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleAlert,
  Database,
  Download,
  FileWarning,
  Gauge,
  ImageOff,
  Info,
  Layers,
  Loader2,
  Play,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Card, CardContent } from "@/shared/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { Progress } from "@/shared/ui/progress"
import { cn } from "@/shared/lib/utils"
import { services } from "@/shared/services"
import { useDatasetIntelligenceViewModel } from "@/features/dataset-intelligence/model/dataset-intelligence-viewmodel"
import type { Project } from "@/shared/types/core"
import type {
  AnnotationRef,
  DatasetAnalytics,
  ImageQualityRef,
  ImageRef,
  OutlierRef,
} from "@/shared/types/dataset-intelligence"

const DatasetIntelligence = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get("projectId") || ""

  if (!projectId) {
    return <ProjectPicker onPick={(id) => setSearchParams({ projectId: id })} />
  }
  return (
    <Dashboard
      projectId={projectId}
      onChangeProject={() => setSearchParams({})}
    />
  )
})

DatasetIntelligence.displayName = "DatasetIntelligence"

export default DatasetIntelligence

// ── Project picker (shown when no project is selected) ──────────────────────

const ProjectPicker = ({ onPick }: { onPick: (id: string) => void }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void services
      .getProjectService()
      .list()
      .then(setProjects)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ScanSearch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dataset Intelligence
            </h1>
            <p className="text-muted-foreground">
              Choose a project to analyze its quality, balance, and outliers
            </p>
          </div>
        </div>

        {isLoading ? (
          <CenteredSpinner label="Loading projects..." />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No projects yet"
            description="Create a project and add items before running analysis."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onPick(project.id)}
                className="text-left"
              >
                <Card className="bg-card border-border hover:border-primary/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Boxes className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {project.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {project.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────

const Dashboard = ({
  projectId,
  onChangeProject,
}: {
  projectId: string
  onChangeProject: () => void
}) => {
  const vm = useDatasetIntelligenceViewModel(projectId)
  const [projectName, setProjectName] = useState("")
  const [includeImageQuality, setIncludeImageQuality] = useState(true)

  useEffect(() => {
    void services
      .getProjectService()
      .getById(projectId)
      .then((project) => setProjectName(project?.name ?? ""))
      .catch(() => setProjectName(""))
  }, [projectId])

  const report = vm.report
  const progressPct = Math.round((vm.job?.progress ?? 0) * 100)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ScanSearch className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Dataset Intelligence
              </h1>
              <button
                onClick={onChangeProject}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {projectName || "Project"} · change project
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none mr-1">
              <input
                type="checkbox"
                checked={includeImageQuality}
                onChange={(event) =>
                  setIncludeImageQuality(event.target.checked)
                }
                disabled={vm.isRunning}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Analyze image pixels
            </label>
            {report && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => vm.exportReport("json")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => vm.exportReport("markdown")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Markdown
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => vm.runAnalysis({ includeImageQuality })}
              disabled={vm.isRunning}
              className="gap-2"
            >
              {vm.isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {vm.isRunning ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </div>

        {/* Running progress */}
        {vm.isRunning && vm.job && (
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium text-foreground">
                  {vm.job.stage}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {progressPct}%
                </span>
              </div>
              <Progress value={progressPct} />
            </CardContent>
          </Card>
        )}

        {vm.error && (
          <Card className="bg-destructive/10 border-destructive/20 mb-6">
            <CardContent className="p-4 text-sm text-destructive">
              {vm.error}
            </CardContent>
          </Card>
        )}

        {/* Body */}
        {vm.isLoading ? (
          <CenteredSpinner label="Loading analysis..." />
        ) : !report ? (
          <EmptyState
            icon={Sparkles}
            title="No analysis yet"
            description="Run an analysis to compute class balance, quality issues, image-quality metrics, and outliers for this dataset."
            action={
              <Button
                onClick={() => vm.runAnalysis({ includeImageQuality })}
                disabled={vm.isRunning}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Run Analysis
              </Button>
            }
          />
        ) : (
          <ReportView vm={vm} />
        )}
      </div>
    </div>
  )
}

// ── Report view ─────────────────────────────────────────────────────────────

const ReportView = ({
  vm,
}: {
  vm: ReturnType<typeof useDatasetIntelligenceViewModel>
}) => {
  const report = vm.report!
  const { health, analytics, quality, imageQuality, outliers } = report

  const qualityCount =
    quality.missingLabels.length +
    quality.emptyAnnotations.length +
    quality.invalidPolygons.length +
    quality.corruptedImages.length
  const imageQualityCount =
    imageQuality.blurry.length +
    imageQuality.overexposed.length +
    imageQuality.underexposed.length +
    imageQuality.lowResolution.length
  const outlierCount =
    outliers.embeddingOutliers.length +
    outliers.rareClasses.length +
    outliers.suspiciousLabels.length

  return (
    <div className="space-y-6">
      {/* Health summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthScoreCard score={health.score} />
        <StatCard
          icon={CircleAlert}
          label="Errors"
          value={health.errors}
          tone="error"
        />
        <StatCard
          icon={AlertTriangle}
          label="Warnings"
          value={health.warnings}
          tone="warning"
        />
        <StatCard icon={Info} label="Info" value={health.infos} tone="info" />
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <Tabs defaultValue="overview">
          <div className="border-b border-border px-4 pt-4 overflow-x-auto">
            <TabsList className="grid w-full min-w-[560px] max-w-3xl grid-cols-5">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="quality" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Quality
                <CountBadge value={qualityCount} />
              </TabsTrigger>
              <TabsTrigger value="image-quality" className="gap-2">
                <Gauge className="h-4 w-4" />
                Image Quality
                <CountBadge value={imageQualityCount} />
              </TabsTrigger>
              <TabsTrigger value="outliers" className="gap-2">
                <Activity className="h-4 w-4" />
                Outliers
                <CountBadge value={outlierCount} />
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <Layers className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Analytics */}
          <TabsContent value="overview" className="p-6 space-y-6">
            <AnalyticsTab analytics={analytics} />
          </TabsContent>

          {/* Quality */}
          <TabsContent value="quality" className="p-6 space-y-4">
            <IssueSection
              icon={Tag}
              tone="warning"
              title="Missing labels"
              subtitle="Items with no annotations"
              items={quality.missingLabels.map(imageRefToItem)}
            />
            <IssueSection
              icon={FileWarning}
              tone="error"
              title="Empty annotations"
              subtitle="Annotations with no usable geometry"
              items={quality.emptyAnnotations.map(annotationRefToItem)}
            />
            <IssueSection
              icon={FileWarning}
              tone="error"
              title="Invalid polygons"
              subtitle="Too few points, zero area, or self-intersecting"
              items={quality.invalidPolygons.map(annotationRefToItem)}
            />
            <IssueSection
              icon={ImageOff}
              tone="error"
              title="Corrupted images"
              subtitle="Files that could not be decoded"
              items={quality.corruptedImages.map(imageRefToItem)}
            />
          </TabsContent>

          {/* Image quality */}
          <TabsContent value="image-quality" className="p-6 space-y-4">
            {!report.imageQualityAnalyzed ? (
              <EmptyInline text="Image-pixel analysis was disabled for this report. Re-run with “Analyze image pixels” enabled." />
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Analyzed {imageQuality.analyzed} images
                  {imageQuality.skipped > 0 &&
                    ` · skipped ${imageQuality.skipped} (unsupported format)`}
                </div>
                <IssueSection
                  icon={ScanSearch}
                  tone="warning"
                  title="Blurry"
                  subtitle="Low variance-of-Laplacian sharpness"
                  items={imageQuality.blurry.map(imageQualityRefToItem)}
                />
                <IssueSection
                  icon={Gauge}
                  tone="warning"
                  title="Overexposed"
                  subtitle="High mean luminance / clipped highlights"
                  items={imageQuality.overexposed.map(imageQualityRefToItem)}
                />
                <IssueSection
                  icon={Gauge}
                  tone="warning"
                  title="Underexposed"
                  subtitle="Low mean luminance / crushed shadows"
                  items={imageQuality.underexposed.map(imageQualityRefToItem)}
                />
                <IssueSection
                  icon={ImageOff}
                  tone="warning"
                  title="Resolution issues"
                  subtitle="Too small or extreme aspect ratio"
                  items={imageQuality.lowResolution.map(imageQualityRefToItem)}
                />
              </>
            )}
          </TabsContent>

          {/* Outliers */}
          <TabsContent value="outliers" className="p-6 space-y-4">
            <IssueSection
              icon={Activity}
              tone="info"
              title="Embedding outliers"
              subtitle="Images far from the dataset feature centroid"
              items={outliers.embeddingOutliers.map(outlierRefToItem)}
            />
            <IssueSection
              icon={Tag}
              tone="info"
              title="Rare classes"
              subtitle="Classes with very few annotations"
              items={outliers.rareClasses.map((item) => ({
                primary: item.label,
                secondary: `${item.count} annotations · ${item.percentage.toFixed(1)}%`,
              }))}
            />
            <IssueSection
              icon={CircleAlert}
              tone="warning"
              title="Suspicious labels"
              subtitle="Tiny or out-of-bounds boxes"
              items={outliers.suspiciousLabels.map(annotationRefToItem)}
            />
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="p-6">
            <ReportsTab vm={vm} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

// ── Analytics tab ───────────────────────────────────────────────────────────

const AnalyticsTab = ({ analytics }: { analytics: DatasetAnalytics }) => {
  const { datasetStats: stats, resolutionStats: res, classDistribution } =
    analytics
  const maxClass = Math.max(1, ...classDistribution.map((c) => c.count))

  return (
    <>
      {/* Dataset stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Database} label="Items" value={stats.totalItems} />
        <StatCard
          icon={ShieldCheck}
          label="Annotated"
          value={`${stats.annotatedPercentage.toFixed(0)}%`}
          hint={`${stats.annotatedImages}/${stats.totalItems}`}
        />
        <StatCard
          icon={Layers}
          label="Annotations"
          value={stats.totalAnnotations}
          hint={`avg ${stats.meanAnnotationsPerImage.toFixed(1)}/img`}
        />
        <StatCard
          icon={Tag}
          label="Unannotated"
          value={stats.unannotatedImages}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class distribution */}
        <Panel title="Class distribution" subtitle="Annotations per class">
          {classDistribution.length === 0 ? (
            <EmptyInline text="No annotations to distribute." />
          ) : (
            <div className="space-y-2.5">
              {classDistribution.slice(0, 14).map((item) => (
                <DistributionBar
                  key={item.label}
                  label={item.label}
                  color={item.color || "#6366f1"}
                  count={item.count}
                  percentage={item.percentage}
                  max={maxClass}
                />
              ))}
              {classDistribution.length > 14 && (
                <p className="text-xs text-muted-foreground pt-1">
                  +{classDistribution.length - 14} more classes
                </p>
              )}
            </div>
          )}
        </Panel>

        {/* Label distribution */}
        <Panel title="Label usage" subtitle="Defined labels and their coverage">
          {analytics.labelDistribution.length === 0 ? (
            <EmptyInline text="No labels defined." />
          ) : (
            <div className="divide-y divide-border">
              {analytics.labelDistribution.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 py-2 first:pt-0"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 min-w-0 truncate text-sm text-foreground">
                    {label.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {label.annotationCount} ann · {label.itemCount} img
                  </span>
                  {!label.used && (
                    <Badge variant="secondary" className="text-[10px]">
                      unused
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Resolution */}
        <Panel title="Resolution" subtitle="Common image sizes">
          {res.commonResolutions.length === 0 ? (
            <EmptyInline text="No resolution data." />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <MiniStat
                  label="Width"
                  value={`${res.minWidth}–${res.maxWidth}`}
                />
                <MiniStat
                  label="Height"
                  value={`${res.minHeight}–${res.maxHeight}`}
                />
                <MiniStat
                  label="Median"
                  value={`${res.medianWidth}×${res.medianHeight}`}
                />
                <MiniStat
                  label="Mean MP"
                  value={res.megapixelsMean.toFixed(2)}
                />
              </div>
              <div className="space-y-1.5 pt-1">
                {res.commonResolutions.slice(0, 6).map((item) => (
                  <div
                    key={`${item.width}x${item.height}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground tabular-nums">
                      {item.width}×{item.height}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Annotation types + aspect ratios */}
        <Panel title="Composition" subtitle="Annotation types & aspect ratios">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Annotation types
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.annotationTypes.length === 0 ? (
                  <EmptyInline text="None" />
                ) : (
                  stats.annotationTypes.map((type) => (
                    <Badge key={type.type} variant="secondary">
                      {type.type}: {type.count}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Aspect ratios
              </p>
              <div className="flex flex-wrap gap-2">
                {res.aspectBuckets.length === 0 ? (
                  <EmptyInline text="None" />
                ) : (
                  res.aspectBuckets.map((bucket) => (
                    <Badge key={bucket.ratio} variant="secondary">
                      {bucket.ratio}: {bucket.count}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  )
}

// ── Reports tab ─────────────────────────────────────────────────────────────

const ReportsTab = ({
  vm,
}: {
  vm: ReturnType<typeof useDatasetIntelligenceViewModel>
}) => {
  if (vm.reports.length === 0) {
    return <EmptyInline text="No saved reports yet." />
  }
  return (
    <div className="space-y-2">
      {vm.reports.map((summary) => {
        const isActive = vm.report?.id === summary.id
        return (
          <div
            key={summary.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border p-3",
              isActive && "border-primary/50 bg-primary/5"
            )}
          >
            <div className="p-2 rounded-md bg-muted">
              <Activity className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {new Date(summary.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.itemCount} images · {summary.annotationCount} annotations ·
                health {summary.health.score.toFixed(0)}/100
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {summary.health.errors}E / {summary.health.warnings}W
            </Badge>
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => vm.selectReport(summary.id)}
              >
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => vm.deleteReport(summary.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

// ── Reusable building blocks ────────────────────────────────────────────────

type Tone = "error" | "warning" | "info" | "neutral"

const toneClasses: Record<Tone, string> = {
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  neutral: "bg-muted text-foreground",
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  hint?: string
  tone?: Tone
}) => (
  <Card className="bg-card border-border">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
)

const HealthScoreCard = ({ score }: { score: number }) => {
  const tone: Tone = score >= 85 ? "info" : score >= 60 ? "warning" : "error"
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", toneClasses[tone])}>
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Health score</p>
            <p className="text-xl font-bold text-foreground">
              {score.toFixed(0)}
              <span className="text-sm font-normal text-muted-foreground">
                /100
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const Panel = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) => (
  <Card className="bg-card border-border">
    <CardContent className="p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </CardContent>
  </Card>
)

const DistributionBar = ({
  label,
  color,
  count,
  percentage,
  max,
}: {
  label: string
  color: string
  count: number
  percentage: number
  max: number
}) => (
  <div>
    <div className="flex items-center justify-between text-sm mb-1">
      <span className="flex items-center gap-2 min-w-0">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-foreground">{label}</span>
      </span>
      <span className="text-muted-foreground tabular-nums shrink-0">
        {count} · {percentage.toFixed(1)}%
      </span>
    </div>
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, (count / max) * 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  </div>
)

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/50 px-3 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground tabular-nums">{value}</p>
  </div>
)

interface IssueItem {
  primary: string
  secondary?: string
}

const IssueSection = ({
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
}) => {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items.slice(0, 500) : items.slice(0, 8)

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("p-2 rounded-lg", toneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <Badge
                variant={items.length === 0 ? "secondary" : "default"}
                className="tabular-nums"
              >
                {items.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-1">No issues found.</p>
        ) : (
          <>
            <div className="divide-y divide-border rounded-md border border-border">
              {visible.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="text-sm text-foreground truncate">
                    {item.primary}
                  </span>
                  {item.secondary && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.secondary}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {items.length > 8 && (
              <button
                onClick={() => setExpanded((value) => !value)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                {expanded
                  ? "Show less"
                  : `Show ${Math.min(items.length, 500) - 8} more`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

const CountBadge = ({ value }: { value: number }) =>
  value > 0 ? (
    <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-medium text-foreground tabular-nums">
      {value}
    </span>
  ) : null

const CenteredSpinner = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  </div>
)

const EmptyInline = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground">{text}</p>
)

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) => (
  <div className="text-center py-16">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-muted-foreground max-w-md mx-auto mb-5">{description}</p>
    {action}
  </div>
)

// ── Ref → item adapters ─────────────────────────────────────────────────────

const imageRefToItem = (ref: ImageRef): IssueItem => ({
  primary: ref.name,
  secondary: ref.reason ?? undefined,
})

const annotationRefToItem = (ref: AnnotationRef): IssueItem => ({
  primary: `${ref.label} · ${ref.imageName}`,
  secondary: ref.reason,
})

const imageQualityRefToItem = (ref: ImageQualityRef): IssueItem => ({
  primary: ref.name,
  secondary: ref.reason,
})

const outlierRefToItem = (ref: OutlierRef): IssueItem => ({
  primary: ref.name,
  secondary: ref.reason,
})
