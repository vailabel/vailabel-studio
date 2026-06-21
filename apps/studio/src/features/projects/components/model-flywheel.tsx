import { Fragment } from "react"
import { useNavigate } from "react-router-dom"
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
import { Button } from "@/shared/ui/button"
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
  onContinueLabeling,
}: {
  projectId?: string
  annotatedImages: number
  totalItems: number
  /** Navigate into labeling (first unlabeled item, else first item). */
  onContinueLabeling?: () => void
}) {
  const {
    versions,
    latest,
    bestMap50,
    isTraining,
    serveVersion,
    servingJobId,
    pendingPredictions,
    autoLabelBacklog,
    isAutoLabeling,
  } = useProjectModelVersions(projectId)
  const navigate = useNavigate()
  const isServing = latest != null && servingJobId === latest.jobId

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

  // --- Workflow cockpit: the single next best action + the loop-step jumps. ---
  const backlog = Math.max(0, totalItems - annotatedImages)
  const pendingCount = pendingPredictions?.predictions ?? 0
  const reviewItemId = pendingPredictions?.firstItemId ?? null
  const nextVersionLabel = `v${versions.length + 1}`

  const goLabel = () => onContinueLabeling?.()
  const goReview = () => {
    if (reviewItemId && projectId)
      navigate(`/projects/${projectId}/studio/${reviewItemId}`)
    else onContinueLabeling?.()
  }
  const goTrain = () => {
    if (projectId) navigate(`/projects/train/${projectId}`)
  }
  const goServe = () => {
    if (latest) void serveVersion(latest.jobId, `v${latest.version}`)
  }
  const goAutoLabel = () => void autoLabelBacklog()

  const next: {
    title: string
    hint: string
    primary: { label: string; icon: typeof Pencil; onClick: () => void; busy?: boolean }
    secondary?: { label: string; onClick: () => void }
  } = (() => {
    if (isTraining) {
      return {
        title: `Training ${nextVersionLabel}…`,
        hint: "Your next model version is training. You can keep labeling while it runs.",
        primary: { label: "Continue labeling", icon: Pencil, onClick: goLabel },
      }
    }
    if (totalItems === 0) {
      return {
        title: "Add data to get started",
        hint: "Upload images on the Add data tab, then label a few and train your first model.",
        primary: { label: "Start labeling", icon: Pencil, onClick: goLabel },
      }
    }
    if (pendingCount > 0) {
      return {
        title: `Review ${pendingCount} AI prediction${pendingCount === 1 ? "" : "s"}`,
        hint: "Accept or reject the model's suggestions right on the canvas (✓/✗ on each box).",
        primary: { label: "Review predictions", icon: Eye, onClick: goReview },
      }
    }
    if (versions.length === 0) {
      if (annotatedImages < 10) {
        return {
          title: "Label a few images to start",
          hint: `Label ${Math.max(1, 10 - annotatedImages)} more, then train your first model.`,
          primary: { label: "Start labeling", icon: Pencil, onClick: goLabel },
        }
      }
      return {
        title: "Train your first model",
        hint: `${annotatedImages} labeled images is enough for a v1 — give it a try.`,
        primary: { label: "Train v1", icon: Zap, onClick: goTrain },
      }
    }
    if (backlog > 0) {
      if (isSmartEnough) {
        return {
          title: `Auto-label the ${backlog} remaining image${backlog === 1 ? "" : "s"}`,
          hint: `This model is strong (best mAP ${pct(bestMap50)}). Auto-label the backlog, then spot-check the suggestions.`,
          primary: {
            label: isAutoLabeling ? "Auto-labeling…" : "Auto-label backlog",
            icon: Wand2,
            onClick: goAutoLabel,
            busy: isAutoLabeling,
          },
          secondary: { label: "Keep labeling", onClick: goLabel },
        }
      }
      return {
        title: `Label more to lift mAP (${coverage}% covered)`,
        hint: "Keep labeling the harder images, then retrain — that improves the model fastest.",
        primary: { label: "Continue labeling", icon: Pencil, onClick: goLabel },
        secondary: { label: `Train ${nextVersionLabel}`, onClick: goTrain },
      }
    }
    return {
      title: `Train ${nextVersionLabel} to improve`,
      hint: "Everything's labeled and reviewed. Train a new version to push mAP higher.",
      primary: { label: `Train ${nextVersionLabel}`, icon: Zap, onClick: goTrain },
      secondary: latest ? { label: `Serve v${latest.version}`, onClick: goServe } : undefined,
    }
  })()

  const NextIcon = next.primary.icon

  // Loop-step → action (the strip is now clickable). Steps that don't apply yet
  // are disabled rather than hidden, so the loop always reads the same.
  const stepActions: Record<
    (typeof LOOP_STEPS)[number]["label"],
    { onClick: () => void; disabled: boolean }
  > = {
    Label: { onClick: goLabel, disabled: totalItems === 0 },
    Train: { onClick: goTrain, disabled: !projectId || isTraining },
    "Auto-label": {
      onClick: goAutoLabel,
      disabled: backlog === 0 || isAutoLabeling || isTraining,
    },
    Review: { onClick: goReview, disabled: pendingCount === 0 },
    Improve: { onClick: goTrain, disabled: !projectId || isTraining },
  }

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
        {/* Next best action — the workflow cockpit. */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {next.primary.busy ? (
                <RefreshCw className="size-5 animate-spin" aria-hidden />
              ) : (
                <NextIcon className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Next step
              </p>
              <p className="text-sm font-semibold">{next.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{next.hint}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={next.primary.busy}
              onClick={next.primary.onClick}
            >
              {next.primary.busy ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <NextIcon className="size-4" />
              )}
              {next.primary.label}
            </Button>
            {next.secondary && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={next.secondary.onClick}
              >
                {next.secondary.label}
              </Button>
            )}
          </div>
        </div>

        {/* Loop strip — each step jumps to that part of the workflow. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
          {LOOP_STEPS.map((step, index) => (
            <Fragment key={step.label}>
              <button
                type="button"
                onClick={stepActions[step.label].onClick}
                disabled={stepActions[step.label].disabled}
                className={
                  "inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:hover:bg-card " +
                  (index === LOOP_STEPS.length - 1
                    ? "border-primary/40 text-primary"
                    : "")
                }
              >
                <step.icon className="size-4 text-muted-foreground" aria-hidden />
                {step.label}
              </button>
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

        {/* Serve: make a trained version the active detector for auto-label & the
            Copilot. Kept always-available (it isn't always the "next step"). */}
        {latest && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isTraining || isServing}
              onClick={() => void serveVersion(latest.jobId, `v${latest.version}`)}
              title="Export this version and make it the model auto-label & the Copilot use"
            >
              {isServing ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Serve v{latest.version}
            </Button>
          </div>
        )}

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
