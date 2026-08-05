import type { AnalysisJob } from "@/shared/types/dataset-intelligence"
import { Card, CardContent } from "@/shared/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress"

/** Live stage + percentage for an in-flight analysis job. */
export function AnalysisProgress({ job }: { job: AnalysisJob }) {
  const percent = Math.round((job.progress ?? 0) * 100)

  return (
    <Card size="sm">
      <CardContent>
        <Progress value={percent} className="gap-y-2">
          <ProgressLabel className="text-foreground">{job.stage}</ProgressLabel>
          <ProgressValue />
        </Progress>
      </CardContent>
    </Card>
  )
}
