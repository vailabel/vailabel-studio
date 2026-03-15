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
import type { ImageData, Label } from "@vailabel/core"
import { services } from "@/services"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import { getRandomColor } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"

interface AIDetectionButtonProps {
  image: ImageData | null
  disabled?: boolean
  onOpenModelSettings?: () => void
  onRefreshAnnotations?: () => Promise<void>
}

export const AIDetectionButton = ({
  image,
  disabled,
  onOpenModelSettings,
  onRefreshAnnotations,
}: AIDetectionButtonProps) => {
  const { toast } = useToast()
  const { selectedModel } = useAIModelViewModel()
  const [isDetecting, setIsDetecting] = useState(false)

  const handleDetection = async () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please select an image first",
        variant: "destructive",
      })
      return
    }
    if (!selectedModel?.id) {
      toast({
        title: "Select a model first",
        description: "Download or choose a model before running AI annotation.",
      })
      onOpenModelSettings?.()
      return
    }
    setIsDetecting(true)
    try {
      const drafts = await services.getAIModelService().runModelInference({
        imageId: image.id,
        modelId: selectedModel.id,
      })

      if (drafts.length === 0) {
        toast({
          title: "No detections found",
          description: "The current model did not produce any draft annotations.",
        })
        return
      }

      const projectId = image.projectId || image.project_id
      const labels = projectId
        ? await services.getLabelService().getLabelsByProjectId(projectId)
        : []

      for (const draft of drafts) {
        const label = await ensureDraftLabel(draft, labels, projectId)
        if (label && !labels.some((entry) => entry.id === label.id)) {
          labels.push(label)
        }
        await services.getAnnotationService().createAnnotation({
          id: uuidv4(),
          name: draft.name,
          type: draft.type,
          coordinates: draft.coordinates,
          imageId: image.id,
          image_id: image.id,
          projectId,
          project_id: projectId,
          labelId: label?.id,
          label_id: label?.id,
          color: label?.color || draft.labelColor || getRandomColor(),
          isAIGenerated: true,
        })
      }

      await onRefreshAnnotations?.()
      toast({
        title: "AI annotations created",
        description:
          drafts.length === 1
            ? "1 draft annotation was added to the canvas."
            : `${drafts.length} draft annotations were added to the canvas.`,
      })
    } catch (error) {
      console.error("AI detection failed:", error)
      toast({
        title: "AI detection failed",
        description:
          error instanceof Error
            ? error.message
            : "The selected model could not process this image.",
        variant: "destructive",
      })
    } finally {
      setIsDetecting(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8"
            onClick={handleDetection}
            disabled={disabled || isDetecting || !image}
          >
            {isDetecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {selectedModel
            ? `Run AI detection with ${selectedModel.name}`
            : "Choose a model to enable AI-assisted annotation"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

async function ensureDraftLabel(
  draft: {
    labelId?: string
    labelName?: string
    labelColor?: string
    name: string
  },
  labels: Label[],
  projectId?: string
) {
  if (draft.labelId) {
    const existingById = labels.find((label) => label.id === draft.labelId)
    if (existingById) return existingById
  }

  const desiredName = draft.labelName || draft.name
  const existingByName = labels.find(
    (label) => label.name.toLowerCase() === desiredName.toLowerCase()
  )
  if (existingByName) return existingByName
  if (!projectId) return null

  return services.getLabelService().createLabel({
    id: uuidv4(),
    name: desiredName,
    color: draft.labelColor || getRandomColor(),
    isAIGenerated: true,
    projectId,
    project_id: projectId,
  })
}
