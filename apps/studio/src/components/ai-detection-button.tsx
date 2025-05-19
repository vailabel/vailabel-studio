import { useState, useEffect } from "react"
import { Brain, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import type { Annotation, ImageData, Label } from "@vailabel/core"
import { useDataAccess } from "@/hooks/use-data-access"
import { getRandomColor } from "@/lib/utils"

interface AIDetectionButtonProps {
  image: ImageData | null
  disabled?: boolean
}

export function AIDetectionButton({ image, disabled }: AIDetectionButtonProps) {
  const { toast } = useToast()
  const [isDetecting, setIsDetecting] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const { getSelectedModel, getSetting, createAnnotation } = useDataAccess()

  useEffect(() => {
    if (!window.ipc?.on) return
    const handler = (_event: unknown, msg: string) => {
      setProgress((prev) => prev + msg)
    }
    window.ipc.on("yolo-progress", handler)
    return () => {
      if (window.ipc?.off) window.ipc.off("yolo-progress", handler)
      setProgress("")
    }
  }, [])

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
    setProgress("")
    try {
      const modelPath = await getSelectedModel().then(
        (model) => model?.modelPath
      )
      const pythonPath = await getSetting("pythonPath").then(
        (setting) => setting?.value
      )
      const detections = await window.ipc.invoke("run-yolo", {
        modelPath,
        imagePath: image.data, // base64 string
        pythonPath,
      })
      console.log("AI detection result:", detections)
      // Render detections as annotations
      if (Array.isArray(detections)) {
        detections.forEach(
          (detection: {
            box: { x1: number; y1: number; x2: number; y2: number }
            name: string
            confidence: number
          }) => {
            const { box, name: className, confidence } = detection
            if (!box || typeof box !== "object") return
            // Use box.x1, y1, x2, y2 from YOLO output
            const x1 = box.x1
            const y1 = box.y1
            const x2 = box.x2
            const y2 = box.y2
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
              label: {
                id: crypto.randomUUID(),
                name: className,
                projectId: image.projectId,
                isAIGenerated: true,
                confidence: confidence,
                category: "AI",
              } as unknown as Label,
              labelId: crypto.randomUUID(),
              color: getRandomColor(),
              isAIGenerated: true,
            }
            createAnnotation(annotation)
          }
        )
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
      {/* Progress output */}
      {isDetecting && progress && (
        <pre className="mt-2 max-h-32 overflow-y-auto text-xs bg-black text-green-200 rounded p-2 whitespace-pre-wrap border border-gray-700">
          {progress}
        </pre>
      )}
    </TooltipProvider>
  )
}
