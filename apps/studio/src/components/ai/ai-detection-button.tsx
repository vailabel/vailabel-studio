import { useState } from "react"
import { Brain, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import type { ImageData } from "@/types/core"

interface AIDetectionButtonProps {
  image: ImageData | null
  selectedModelId?: string
  selectedModelName?: string
  selectedModelPredictionReady?: boolean
  selectedModelCanAttemptPrediction?: boolean
  selectedModelWillConvertOnRun?: boolean
  selectedModelUnsupportedReason?: string
  disabled?: boolean
  isGenerating?: boolean
  onOpenModelSettings?: () => void
  onGeneratePredictions: (modelId: string) => Promise<unknown>
}

export const AIDetectionButton = ({
  image,
  selectedModelId,
  selectedModelName,
  selectedModelPredictionReady = false,
  selectedModelCanAttemptPrediction = false,
  selectedModelWillConvertOnRun = false,
  selectedModelUnsupportedReason,
  disabled,
  isGenerating = false,
  onOpenModelSettings,
  onGeneratePredictions,
}: AIDetectionButtonProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDetection = async () => {
    if (!image) {
      toast.error("No image selected", {
        description: "Please select an image first",
      })
      return
    }

    if (!selectedModelId) {
      toast("Select a model first", {
        description: "Import or choose a local model before running AI annotation.",
      })
      onOpenModelSettings?.()
      return
    }

    if (!selectedModelCanAttemptPrediction) {
      toast.error("Selected model is not ready", {
        description:
          selectedModelUnsupportedReason ||
          "Choose a detection-ready local model before running AI detect.",
      })
      onOpenModelSettings?.()
      return
    }

    setIsSubmitting(true)
    try {
      await onGeneratePredictions(selectedModelId)
      toast("Pre-annotations generated", {
        description: "Review and correct the suggested labels before accepting them.",
      })
    } catch (error) {
      console.error("Prediction generation failed:", error)
      toast.error("Prediction generation failed", {
        description:
          error instanceof Error
            ? error.message
            : "The selected model could not process this image.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isGenerating || isSubmitting

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8"
              onClick={handleDetection}
              disabled={disabled || busy || !image}
            />
          }
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {selectedModelName && !selectedModelCanAttemptPrediction
            ? selectedModelUnsupportedReason ||
              `${selectedModelName} is not ready for AI detect yet`
            : selectedModelName && !selectedModelPredictionReady && selectedModelWillConvertOnRun
            ? `Generate pre-annotations with ${selectedModelName}. This checkpoint may be converted to ONNX first.`
            : selectedModelName
            ? `Generate pre-annotations with ${selectedModelName}`
            : "Choose a model to enable ML-assisted labeling"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

