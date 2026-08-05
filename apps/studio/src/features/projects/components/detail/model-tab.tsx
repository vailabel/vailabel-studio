import { Brain } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { ModelFlywheel } from "@/features/projects/components/model-flywheel"
import { TrainingMonitor } from "@/shared/components/training/training-monitor"
import { TabHeading } from "./tab-heading"

export function ModelTab({
  projectId,
  annotatedItems,
  totalItems,
  onTrain,
  onContinueLabeling,
}: {
  projectId: string | undefined
  annotatedItems: number
  totalItems: number
  onTrain: () => void
  onContinueLabeling: () => void
}) {
  return (
    <>
      <TabHeading
        title="Project model"
        description="This project trains its own model from your labels. Label a few → train → auto-label → correct → repeat; each cycle improves the model and the latest version pre-labels the rest."
        actions={
          <Button onClick={onTrain}>
            <Brain />
            Train new version
          </Button>
        }
      />
      <ModelFlywheel
        projectId={projectId}
        annotatedImages={annotatedItems}
        totalItems={totalItems}
        onContinueLabeling={onContinueLabeling}
      />
      <TrainingMonitor projectId={projectId} onUseForLabeling={onContinueLabeling} />
    </>
  )
}
