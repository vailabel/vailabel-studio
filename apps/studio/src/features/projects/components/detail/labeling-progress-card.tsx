import { Card, CardContent } from "@/shared/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress"

/** Overall labeling completion for the project. */
export function LabelingProgressCard({
  annotatedItems,
  totalItems,
  progress,
}: {
  annotatedItems: number
  totalItems: number
  progress: number
}) {
  return (
    <Card>
      <CardContent>
        <Progress value={progress} className="gap-y-2">
          <ProgressLabel className="text-base text-foreground">
            Labeling progress
          </ProgressLabel>
          <ProgressValue>
            {() => `${annotatedItems} / ${totalItems} images · ${progress}%`}
          </ProgressValue>
        </Progress>
      </CardContent>
    </Card>
  )
}
