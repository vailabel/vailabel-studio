import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Play, Square, RotateCcw, ScrollText, Download, Trash2 } from "lucide-react"
import {
  useAiRuntimeViewModel,
  useRuntimeModels,
} from "@/viewmodels/ai-runtime-viewmodel"
import type { RuntimeState } from "@/types/ai-runtime"
import { TrainingMonitor } from "@/components/ai/training-monitor"

const STATE_VARIANT: Record<
  RuntimeState,
  "default" | "secondary" | "destructive" | "outline"
> = {
  stopped: "outline",
  starting: "secondary",
  healthy: "default",
  unhealthy: "destructive",
  restarting: "secondary",
  crashed: "destructive",
}

function formatBytes(mb?: number | null) {
  if (mb == null) return "—"
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export default function RuntimeSettings() {
  const rt = useAiRuntimeViewModel()
  const models = useRuntimeModels()
  const m = rt.status.metrics ?? rt.metrics

  return (
    <div className="space-y-6">
      {/* Runtime status */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Runtime
              <Badge variant={STATE_VARIANT[rt.status.state]}>
                {rt.status.state}
              </Badge>
            </CardTitle>
            <CardDescription>
              Embedded Python/FastAPI service for training, export, and heavy
              models. YOLO/SAM still run in-process — this only spins up on demand.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2"
              disabled={rt.busy || rt.status.state === "healthy"}
              onClick={() => rt.start()}
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={rt.busy || rt.status.state === "stopped"}
              onClick={() => rt.stop()}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={rt.busy}
              onClick={() => rt.restart()}
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => rt.loadLogs()}
            >
              <ScrollText className="h-4 w-4" />
              View logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rt.error && <p className="text-sm text-destructive">{rt.error}</p>}
          {rt.status.lastError && (
            <p className="text-sm text-destructive">
              Last error: {rt.status.lastError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Version" value={rt.status.version ?? "—"} />
            <Metric
              label="CPU"
              value={m ? `${m.cpu.toFixed(0)}%` : "—"}
            />
            <Metric label="RAM" value={formatBytes(m?.ramMb)} />
            <Metric
              label="GPU"
              value={
                m?.gpuUtil != null
                  ? `${m.gpuUtil.toFixed(0)}% · ${formatBytes(m.vramUsedMb)}/${formatBytes(m.vramTotalMb)}`
                  : "—"
              }
            />
          </div>

          {rt.logs && (
            <pre className="max-h-56 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {rt.logs}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Model manager */}
      <Card>
        <CardHeader>
          <CardTitle>Runtime models</CardTitle>
          <CardDescription>
            Heavyweight models for the runtime. Weights download on demand into
            app data — nothing is bundled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {models.error && (
            <p className="mb-3 text-sm text-destructive">{models.error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {model.family}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        model.status === "installed" ? "secondary" : "outline"
                      }
                    >
                      {model.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {model.status === "installed" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-destructive"
                        onClick={() => models.remove(model.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        disabled={models.installingId === model.id}
                        onClick={() => models.install(model.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {models.installingId === model.id
                          ? "Installing…"
                          : "Install"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TrainingMonitor />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
