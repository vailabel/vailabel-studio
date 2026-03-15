import { useState } from "react"
import { Brain, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import type { ImageData } from "@/types/core"

interface AIDetectionButtonProps {
  image: ImageData | null
  selectedModelId?: string
  selectedModelName?: string
  disabled?: boolean
  isGenerating?: boolean
  onOpenModelSettings?: () => void
  onGeneratePredictions: (modelId: string) => Promise<unknown>
}

export const AIDetectionButton = ({
  image,
  selectedModelId,
  selectedModelName,
  disabled,
  isGenerating = false,
  onOpenModelSettings,
  onGeneratePredictions,
}: AIDetectionButtonProps) => {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDetection = async () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please select an image first",
        variant: "destructive",
      })
      return
    }

    if (!selectedModelId) {
      toast({
        title: "Select a model first",
        description: "Import or choose a local model before running AI annotation.",
      })
      onOpenModelSettings?.()
      return
    }

    setIsSubmitting(true)
    try {
      await onGeneratePredictions(selectedModelId)
      toast({
        title: "Predictions generated",
        description: "Review the suggested labels and accept the ones you want.",
      })
    } catch (error) {
      console.error("Prediction generation failed:", error)
      toast({
        title: "Prediction generation failed",
        description:
          error instanceof Error
            ? error.message
            : "The selected model could not process this image.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isGenerating || isSubmitting

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8"
            onClick={handleDetection}
            disabled={disabled || busy || !image}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {selectedModelName
            ? `Generate predictions with ${selectedModelName}`
            : "Choose a model to enable AI-assisted annotation"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

