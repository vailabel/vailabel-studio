"use client"

import { useState } from "react"
import { Brain, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useLabelStore } from "@/lib/store"
import { detectObjects } from "@/lib/ai-utils"
import type { ImageData } from "@/lib/types"

interface AIDetectionButtonProps {
  image: ImageData | null
  disabled?: boolean
}

export function AIDetectionButton({ image, disabled }: AIDetectionButtonProps) {
  const { toast } = useToast()
  const { addLabel } = useLabelStore()
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

    setIsDetecting(true)

    try {
      const detections = await detectObjects(image.data)

      if (detections.length === 0) {
        toast({
          title: "No objects detected",
          description: "The AI model didn't detect any objects in this image",
        })
        return
      }

      // Add each detection as a label
      detections.forEach((detection) => {
        const { box, class: className, confidence } = detection

        // Convert normalized coordinates to actual coordinates
        const [x, y, width, height] = box
        const x1 = x * image.width
        const y1 = y * image.height
        const x2 = (x + width) * image.width
        const y2 = (y + height) * image.height

        // Create label with AI prefix to distinguish it
        addLabel({
          id: `ai-label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${className} (${Math.round(confidence * 100)}%)`,
          category: "AI-detected",
          type: "box",
          coordinates: [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
          imageId: image.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          isAIGenerated: true,
          color: "green-500", // Give AI labels a distinct color
        })
      })

      toast({
        title: "AI Detection Complete",
        description: `Detected ${detections.length} objects in the image`,
      })
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
            {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Auto Detect with AI</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
