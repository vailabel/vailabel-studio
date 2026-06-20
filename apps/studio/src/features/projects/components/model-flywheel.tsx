import { Fragment } from "react"
import {
  ArrowRight,
  Eye,
  Pencil,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wand2,
  Zap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Progress } from "@/shared/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useProjectModelVersions } from "@/features/projects/model/project-model-viewmodel"

/** The five stages of the active-learning data flywheel. */
const LOOP_STEPS = [
  { icon: Pencil, label: "Label" },
  { icon: Zap, label: "Train" },
  { icon: Wand2, label: "Auto-label" },
  { icon: Eye, label: "Review" },
  { icon: TrendingUp, label: "Improve" },
] as const

/** mAP@50 target at which the model is "smart enough" to auto-label the backlog. */
const SMART_TARGET = 0.85

const chartConfig = {
  map50: { label: "mAP@50", color: "var(--chart-1)" },
  map5095: { label: "mAP@50-95", color: "var(--chart-3)" },
} satisfies ChartConfig

const pct = (value: number | null) =>
  value == null ? "—" : `${(value * 100).toFixed(1)}%`

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/**
 * Per-project model flywheel overview. Frames the project's completed training
 * runs as a versioned model lineage (v1, v2, …), charts how mAP improves across
 * versions, and shows progress toward the "smart enough" gate — the loop the
 * user runs: label → train → auto-label → review → improve. Built on the
 * existing training jobs + reports; sits above the training monitor.
 */
export function ModelFlywheel({
  projectId,
  annotatedImages,
  totalItems,
}: {
  projectId?: string
  annotatedImages: number
  totalItems: number
}) {
  const { versions, latest, bestMap50, isTraining } =
    useProjectModelVersions(projectId)

  const coverage =
    totalItems > 0 ? Math.round((annotatedImages / totalItems) * 100) : 0
  const gateProgress =
    bestMap50 != null ? Math.min(100, Math.round((bestMap50 / SMART_TARGET) * 100)) : 0
  const isSmartEnough = bestMap50 != null && bestMap50 >= SMART_TARGET

  const chartData = versions.map((v) => ({
    label: `v${v.version}`,
    map50: v.map50,
    map5095: v.map5095,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-muted-foreground" />
            Model flywheel
          </CardTitle>
          <CardDescription>
            Each cycle improves this project&apos;s own model. Auto-label serves
            the latest version.
          </CardDescription>
        </div>
        {latest ? (
          <Badge variant="secondary" className="gap-1.5">
            {isTraining && (
              <RefreshCw className="size-3.5 animate-spin" aria-hidden />
            )}
            Live: v{latest.version}
          </Badge>
        ) : (
          <Badge variant="outline">No model yet</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Loop strip */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
          {LOOP_STEPS.map((step, index) => (
            <Fragment key={step.label}>
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm " +
                  (index === LOOP_STEPS.length - 1
                    ? "border-primary/40 text-primary"
                    : "")
                }
              >
                <step.icon className="size-4 text-muted-foreground" aria-hidden />
                {step.label}
              </span>
              {index < LOOP_STEPS.length - 1 && (
                <ArrowRight
                  className="size-3.5 text-muted-foreground/60"
                  aria-hidden
                />
              )}
            </Fragment>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5" aria-hidden />
            repeats each cycle
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Versions trained" value={String(versions.length)} />
          <Metric label="Best mAP@50" value={pct(bestMap50)} />
          <Metric
            label="Images labeled"
            value={`${annotatedImages} / ${totalItems}`}
          />
          <Metric label="Coverage" value={`${coverage}%`} />
        </div>

        {/* Improvement chart */}
        {versions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium">Start the flywheel</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Label a handful of images, then train your first model below. Each
              model you train becomes a version here, and you&apos;ll see mAP
              climb as the project improves.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Model improvement across versions</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-3.5"
                    style={{ backgroundColor: "var(--chart-1)" }}
                  />
                  mAP@50
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0 w-3.5 border-t-2 border-dashed"
                    style={{ borderColor: "var(--chart-3)" }}
                  />
                  mAP@50-95
                </span>
              </div>
            </div>
            <ChartContainer
              config={chartConfig}
              style={{ aspectRatio: "auto", height: 240 }}
            >
              <LineChart
                data={chartData}
                margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  domain={[0, 1]}
                  width={40}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="map50"
                  name="map50"
                  stroke="var(--color-map50)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  dataKey="map5095"
                  name="map5095"
                  stroke="var(--color-map5095)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {/* Smart-enough gate */}
        {versions.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
                Smart-enough gate
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {pct(bestMap50)} / {pct(SMART_TARGET)} target
              </span>
            </div>
            <Progress value={gateProgress} />
            <p className="mt-2 text-xs text-muted-foreground">
              {isSmartEnough
                ? "This model is strong enough to auto-label the rest with light spot-checking."
                : "Keep labeling the images the model is least sure about, then retrain — that lifts mAP fastest."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
