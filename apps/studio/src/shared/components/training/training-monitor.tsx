import { useEffect, useRef, useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog"
import {
  ArrowRight,
  BarChart3,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react"
import {
  useTrainingJobs,
  useTrainingLogStream,
} from "@/shared/model/ai-runtime-viewmodel"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import { TrainingStartDialog } from "@/shared/components/training/training-start-dialog"
import { TrainingReportDialog } from "@/shared/components/training/training-report"
import type { TrainingJob, TrainingJobStatus } from "@/shared/types/ai-runtime"

const STATUS_VARIANT: Record<
  TrainingJobStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  canceled: "outline",
}

export function TrainingMonitor({
  projectId,
  onUseForLabeling,
}: {
  projectId?: string
  /** Closes the flywheel: invoked after a trained model is exported + activated
   * so the host can jump straight into labeling with it (e.g. open the studio). */
  onUseForLabeling?: (job: TrainingJob) => void
} = {}) {
  const { jobs: allJobs, loading, error, reload, stop } = useTrainingJobs()
  const jobs = projectId
    ? allJobs.filter((j) => j.projectId === projectId)
    : allJobs
  const [logsFor, setLogsFor] = useState<string | null>(null)
  const [reportFor, setReportFor] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [exportResult, setExportResult] = useState<{
    ok: boolean
    message: string
    job: TrainingJob
  } | null>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const stickRef = useRef(true)

  // Live log tail for the open job. Keeps streaming while the job runs.
  const openJob = jobs.find((j) => j.id === logsFor) ?? null
  const logActive =
    openJob?.status === "running" || openJob?.status === "pending"
  const logLines = useTrainingLogStream(logsFor, logActive)

  // Auto-scroll to the newest line while the user is parked at the bottom; if
  // they scroll up to read history, stop yanking them back down.
  useEffect(() => {
    const el = preRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [logLines])

  const viewLogs = (jobId: string) => {
    stickRef.current = true
    setLogsFor((cur) => (cur === jobId ? null : jobId))
  }

  // Export a finished run's weights to ONNX → registers it as a detection model
  // and makes it the active detector (backend), closing the train→auto-label loop.
  const exportModel = async (job: TrainingJob) => {
    setExportingId(job.id)
    setExportResult(null)
    try {
      const res = await aiRuntimeService.exportTrainedModel(job.id)
      setExportResult({
        ok: res.ok,
        message: res.ok
          ? "Trained model is ready and set as your active detector."
          : res.error || "Export failed.",
        job,
      })
    } catch (e) {
      setExportResult({
        ok: false,
        message: e instanceof Error ? e.message : String(e),
        job,
      })
    } finally {
      setExportingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Training jobs</CardTitle>
          <CardDescription>
            Jobs run in the embedded runtime. Progress and logs update live.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <TrainingStartDialog
            projectId={projectId}
            onStarted={reload}
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New job
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => reload()}
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {projectId
              ? "No training jobs for this project yet. Label some images, then train a model on them."
              : "No training jobs yet."}
          </p>
        )}
        {jobs.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[job.status] ?? "outline"}>
                      {job.status}
                    </Badge>
                    {job.status === "failed" && job.error && (
                      <p
                        className="mt-1 max-w-[16rem] truncate text-xs text-destructive"
                        title={job.error}
                      >
                        {job.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="w-40">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.round((job.progress ?? 0) * 100)}
                        className="flex-1"
                      />
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {Math.round((job.progress ?? 0) * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => viewLogs(job.id)}>
                      Logs
                    </Button>
                    {job.status === "completed" &&
                      !(job.metrics as { simulated?: boolean } | null)?.simulated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setReportFor(job.id)}
                          title="View training metrics (mAP, precision, recall) and plots"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Report
                        </Button>
                      )}
                    {job.status === "completed" &&
                      ((job.metrics as { simulated?: boolean } | null)?.simulated ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title="This run used the placeholder trainer — the runtime has no real training backend (ultralytics) installed, so no model was produced."
                        >
                          Simulated — no model
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          disabled={exportingId === job.id}
                          onClick={() => exportModel(job)}
                          title="Export to ONNX and use for auto-labeling"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {exportingId === job.id
                            ? "Exporting…"
                            : "Use for auto-label"}
                        </Button>
                      ))}
                    {(job.status === "running" || job.status === "pending") && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive"
                            >
                              <Square className="h-3.5 w-3.5" />
                              Stop
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Stop this training run?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Progress so far will be lost and no model is
                              produced. You&apos;ll have to start over to train
                              again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep training</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => stop(job.id)}
                            >
                              Stop run
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {exportResult && (
          <div
            className={
              "flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 " +
              (exportResult.ok
                ? "border-success/30 bg-success/10"
                : "border-destructive/30 bg-destructive/10")
            }
          >
            <p
              className={
                exportResult.ok
                  ? "text-sm text-foreground"
                  : "text-sm text-destructive"
              }
            >
              {exportResult.message}
            </p>
            {exportResult.ok && onUseForLabeling && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => onUseForLabeling(exportResult.job)}
              >
                Label with this model
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {logsFor && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Logs — {logsFor}
                {logActive && (
                  <span className="flex items-center gap-1 text-success">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    live
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setLogsFor(null)}
              >
                Close
              </Button>
            </div>
            <pre
              ref={preRef}
              onScroll={(e) => {
                const el = e.currentTarget
                stickRef.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 40
              }}
              className="max-h-48 overflow-auto text-xs whitespace-pre-wrap"
            >
              {logLines.length ? logLines.join("\n") : "No log output yet."}
            </pre>
          </div>
        )}

        <TrainingReportDialog
          jobId={reportFor}
          onClose={() => setReportFor(null)}
        />
      </CardContent>
    </Card>
  )
}
