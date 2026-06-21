import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart"
import { useTrainingReport } from "@/shared/model/ai-runtime-viewmodel"
import { toAssetUrl } from "@/shared/lib/desktop"
import type { TrainingReport } from "@/shared/types/ai-runtime"

// ultralytics results.csv column names → the headline detection metrics.
const MAP50 = "metrics/mAP50(B)"
const MAP5095 = "metrics/mAP50-95(B)"

const METRIC_CARDS = [
  { key: MAP50, label: "mAP@50", best: true },
  { key: MAP5095, label: "mAP@50-95", best: false },
  { key: "metrics/precision(B)", label: "Precision", best: false },
  { key: "metrics/recall(B)", label: "Recall", best: false },
] as const

const mapChartConfig = {
  map50: { label: "mAP@50", color: "var(--chart-1)" },
  map5095: { label: "mAP@50-95", color: "var(--chart-3)" },
} satisfies ChartConfig

const lossChartConfig = {
  train: { label: "Train loss", color: "var(--chart-2)" },
  val: { label: "Val loss", color: "var(--chart-4)" },
} satisfies ChartConfig

const fmtPct = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "—" : `${(v * 100).toFixed(1)}%`

/** Coerce a results.csv cell to a finite number, or null. */
const num = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null

/** Sum the box/cls/dfl losses for a results.csv split ("train" | "val").
 * Returns null when none of the three columns are present for this row. */
function totalLoss(
  row: Record<string, number | null>,
  split: "train" | "val"
): number | null {
  const parts = ["box_loss", "cls_loss", "dfl_loss"].map((k) =>
    num(row[`${split}/${k}`])
  )
  return parts.every((p) => p == null)
    ? null
    : parts.reduce<number>((a, p) => a + (p ?? 0), 0)
}

/** The epoch that reached the highest mAP@50 — ultralytics serves *that*
 * checkpoint as best.pt, so it (not the final epoch) is what auto-label runs. */
function bestEpoch(history: TrainingReport["history"]) {
  let bestIdx = -1
  let bestMap = -1
  for (let i = 0; i < history.length; i++) {
    const map50 = num(history[i][MAP50])
    if (map50 != null && map50 > bestMap) {
      bestMap = map50
      bestIdx = i
    }
  }
  if (bestIdx < 0) return null
  const row = history[bestIdx]
  return {
    map50: bestMap,
    map5095: num(row[MAP5095]),
    epoch: num(row.epoch) ?? bestIdx + 1,
  }
}

/** Read the run's best mAP@50 and turn it into a plain-language verdict + how to
 * improve. mAP@50 is the standard "is this model any good?" number — and the
 * best epoch is the one that actually gets served. */
function qualityHint(map50: number | null | undefined): {
  tone: "bad" | "ok" | "good"
  text: string
} | null {
  if (map50 == null || Number.isNaN(map50)) return null
  if (map50 < 0.3)
    return {
      tone: "bad",
      text: `mAP@50 is ${(map50 * 100).toFixed(1)}% — the model barely learned. This is almost always too little labeled data. Label more images (aim for dozens+ examples per class), then retrain. More epochs alone won't fix it.`,
    }
  if (map50 < 0.6)
    return {
      tone: "ok",
      text: `mAP@50 is ${(map50 * 100).toFixed(1)}% — usable but rough. More labeled images or training epochs should push it higher.`,
    }
  return {
    tone: "good",
    text: `mAP@50 is ${(map50 * 100).toFixed(1)}% — a solid model. Auto-label should work well.`,
  }
}

const HINT_CLASS: Record<"bad" | "ok" | "good", string> = {
  bad: "border-destructive/40 bg-destructive/10 text-destructive",
  ok: "border-warning/40 bg-warning/10 text-warning",
  good: "border-success/40 bg-success/10 text-success",
}

/** A labelled epoch-axis line chart shell shared by the mAP + loss curves. */
function EpochChart({
  config,
  data,
  children,
  yDomain,
  yFormat,
}: {
  config: ChartConfig
  data: Array<Record<string, number | null>>
  children: React.ReactNode
  yDomain: [number | "auto", number | "auto"]
  yFormat: (v: number) => string
}) {
  return (
    <ChartContainer config={config} style={{ aspectRatio: "auto", height: 240 }}>
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="epoch"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          domain={yDomain}
          width={44}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => yFormat(Number(v))}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {children}
      </LineChart>
    </ChartContainer>
  )
}

/** A coloured legend swatch + label, matching the flywheel chart legend. */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-3.5" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export function TrainingReportDialog({
  jobId,
  onClose,
}: {
  jobId: string | null
  onClose: () => void
}) {
  const { report, loading, error } = useTrainingReport(jobId)

  const history = report?.history ?? []
  const hasCurves = history.length > 1
  const best = hasCurves ? bestEpoch(history) : null

  // Best mAP@50 is what the served model (best.pt) achieves — base the verdict
  // on it, falling back to the final-epoch value for runs with no history.
  const hint = qualityHint(best?.map50 ?? report?.final[MAP50])

  const mapData = history.map((row, i) => ({
    epoch: num(row.epoch) ?? i + 1,
    map50: num(row[MAP50]),
    map5095: num(row[MAP5095]),
  }))
  const lossData = history.map((row, i) => ({
    epoch: num(row.epoch) ?? i + 1,
    train: totalLoss(row, "train"),
    val: totalLoss(row, "val"),
  }))
  const hasValLoss = lossData.some((d) => d.val != null)
  const hasLoss = lossData.some((d) => d.train != null)

  // With interactive curves the static results.png is redundant; keep the rest.
  const plots = (report?.plots ?? []).filter(
    (p) => !(hasCurves && p.label === "Training curves")
  )

  return (
    <Dialog
      open={!!jobId}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[95vw] sm:max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Training report{report ? ` — ${report.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            {report
              ? `${report.epochs} epochs · final-epoch metrics from ultralytics`
              : "Final metrics and plots for this run."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading report…</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {METRIC_CARDS.map((m) => (
                <div key={m.key} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {fmtPct(report.final[m.key])}
                  </p>
                  {m.best && best && (
                    <p className="text-xs text-success tabular-nums">
                      best {fmtPct(best.map50)} · epoch {best.epoch}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {hint && (
              <p
                className={`rounded-md border px-3 py-2 text-sm ${HINT_CLASS[hint.tone]}`}
              >
                {hint.text}
              </p>
            )}

            {hasCurves && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Accuracy per epoch</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <LegendDot color="var(--chart-1)" label="mAP@50" />
                      <LegendDot color="var(--chart-3)" label="50-95" />
                    </div>
                  </div>
                  <EpochChart
                    config={mapChartConfig}
                    data={mapData}
                    yDomain={[0, 1]}
                    yFormat={(v) => `${Math.round(v * 100)}%`}
                  >
                    <Line
                      dataKey="map50"
                      name="map50"
                      stroke="var(--color-map50)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="map5095"
                      name="map5095"
                      stroke="var(--color-map5095)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </EpochChart>
                </div>

                {hasLoss && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Loss per epoch</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <LegendDot color="var(--chart-2)" label="train" />
                        {hasValLoss && (
                          <LegendDot color="var(--chart-4)" label="val" />
                        )}
                      </div>
                    </div>
                    <EpochChart
                      config={lossChartConfig}
                      data={lossData}
                      yDomain={["auto", "auto"]}
                      yFormat={(v) => v.toFixed(2)}
                    >
                      <Line
                        dataKey="train"
                        name="train"
                        stroke="var(--color-train)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                      {hasValLoss && (
                        <Line
                          dataKey="val"
                          name="val"
                          stroke="var(--color-val)"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          isAnimationActive={false}
                        />
                      )}
                    </EpochChart>
                  </div>
                )}
              </div>
            )}

            {plots.length > 0 ? (
              <details className="group rounded-md border" open>
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-muted-foreground select-none hover:text-foreground">
                  <span className="inline-block transition-transform group-open:rotate-90">
                    ▸
                  </span>{" "}
                  Detailed plots from ultralytics ({plots.length})
                </summary>
                <div className="space-y-4 p-3 pt-0">
                  {plots.map((plot) => (
                    <figure key={plot.path} className="space-y-1">
                      <figcaption className="text-xs font-medium text-muted-foreground">
                        {plot.label}
                      </figcaption>
                      <img
                        src={toAssetUrl(plot.path)}
                        alt={plot.label}
                        loading="lazy"
                        className="w-full rounded-md border bg-card"
                      />
                    </figure>
                  ))}
                </div>
              </details>
            ) : (
              !hasCurves && (
                <p className="text-sm text-muted-foreground">
                  No plot images were found for this run.
                </p>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
