import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ProjectProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabel: string
}

export function ProjectProgressIndicator({
  currentStep,
  totalSteps,
  stepLabel,
}: ProjectProgressIndicatorProps) {
  return (
    <div className="text-center mt-12">
      <div className="inline-flex items-center gap-3">
        <Badge variant="secondary">
          Step {currentStep + 1} of {totalSteps}
        </Badge>
        <Separator orientation="vertical" />
        <span className="text-sm text-muted-foreground">{stepLabel}</span>
      </div>
    </div>
  )
}
