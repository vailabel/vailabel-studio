import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RotateCcw, Square } from "lucide-react"
import { useTrainingJobs } from "@/viewmodels/ai-runtime-viewmodel"
import { aiRuntimeService } from "@/services/ai-runtime-service"
import type { TrainingJobStatus } from "@/types/ai-runtime"

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

export function TrainingMonitor() {
  const { jobs, loading, error, reload, stop } = useTrainingJobs()
  const [logsFor, setLogsFor] = useState<string | null>(null)
  const [logText, setLogText] = useState("")

  const viewLogs = async (jobId: string) => {
    setLogsFor(jobId)
    const chunk = await aiRuntimeService.trainingLogs(jobId, 0)
    setLogText(chunk.lines.join("\n"))
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
        <Button variant="outline" size="sm" className="gap-2" onClick={() => reload()}>
          <RotateCcw className="h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">No training jobs yet.</p>
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
                  </TableCell>
                  <TableCell className="w-40">
                    <Progress value={Math.round((job.progress ?? 0) * 100)} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => viewLogs(job.id)}>
                      Logs
                    </Button>
                    {(job.status === "running" || job.status === "pending") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-destructive"
                        onClick={() => stop(job.id)}
                      >
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {logsFor && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Logs — {logsFor}
            </p>
            <pre className="max-h-48 overflow-auto text-xs whitespace-pre-wrap">
              {logText || "No log output yet."}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
