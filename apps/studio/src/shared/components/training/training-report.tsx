import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { useTrainingReport } from "@/shared/model/ai-runtime-viewmodel"
import { toAssetUrl } from "@/shared/lib/desktop"

// ultralytics results.csv column names → the headline detection metrics.
const METRIC_CARDS = [
  { key: "metrics/mAP50(B)", label: "mAP@50" },
  { key: "metrics/mAP50-95(B)", label: "mAP@50-95" },
  { key: "metrics/precision(B)", label: "Precision" },
  { key: "metrics/recall(B)", label: "Recall" },
] as const

const fmtPct = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "—" : `${(v * 100).toFixed(1)}%`

/** Read the run's mAP@50 and turn it into a plain-language verdict + how to
 * improve. mAP@50 is the standard "is this model any good?" number. */
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

export function TrainingReportDialog({
  jobId,
  onClose,
}: {
  jobId: string | null
  onClose: () => void
}) {
  const { report, loading, error } = useTrainingReport(jobId)
  const hint = qualityHint(report?.final["metrics/mAP50(B)"])

  return (
    <Dialog
      open={!!jobId}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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

            {report.plots.length > 0 ? (
              <div className="space-y-4">
                {report.plots.map((plot) => (
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
            ) : (
              <p className="text-sm text-muted-foreground">
                No plot images were found for this run.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
