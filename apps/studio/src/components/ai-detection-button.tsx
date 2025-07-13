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
import type { Annotation, ImageData } from "@vailabel/core"
import { useSettingsStore } from "@/stores/use-settings-store"
import { useLabelStore } from "@/stores/use-label-store"
import { getRandomColor } from "@/lib/utils"
import { useAnnotationsStore } from "@/stores/annotation-store"
import { useProjectStore } from "@/stores/use-project-store"

interface AIDetectionButtonProps {
  image: ImageData | null
  disabled?: boolean
}

export const AIDetectionButton = ({
  image,
  disabled,
}: AIDetectionButtonProps) => {
  const { toast } = useToast()
  const [isDetecting, setIsDetecting] = useState(false)
  const { getSetting } = useSettingsStore()
  const { getOrCreateLabel } = useLabelStore()
  const { createAnnotation } = useAnnotationsStore()
  const { currentProject } = useProjectStore()
  const handleDetection = async () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please select an image first",
        variant: "destructive",
      })
      return
    }
    setIsDetecting(true)
    try {
      const modelPath = await getSetting("modelPath")
      const pythonPath = await getSetting("pythonPath")
      const detections = await window.ipc.invoke("command:runYolo", {
        modelPath: modelPath?.value,
        imagePath: image.data,
        pythonPath: pythonPath?.value,
      })
      // Render detections as annotations
      if (Array.isArray(detections) && currentProject) {
        for (const detection of detections) {
          const { box, name: className } = detection
          if (!box || typeof box !== "object") continue
          const x1 = box.x1
          const y1 = box.y1
          const x2 = box.x2
          const y2 = box.y2
          // First create or get label
          const label = await getOrCreateLabel(
            className,
            getRandomColor(),
            currentProject?.id
          )
          const annotation: Annotation = {
            id: crypto.randomUUID(),
            name: className,
            type: "box",
            coordinates: [
              { x: x1, y: y1 },
              { x: x2, y: y2 },
            ],
            imageId: image.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            label: label,
            labelId: label.id,
            color: label.color,
            isAIGenerated: true,
          }
          await createAnnotation(annotation)
        }
      }
    } catch (error) {
      console.error("AI detection failed:", error)
      toast({
        title: "Detection failed",
        description: "Failed to run AI detection on this image",
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
          Auto Detect with AI (runs YOLOv8 in your Python environment)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
