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
import type { ImageData } from "@vailabel/core"

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
      toast({
        title: "AI detection unavailable",
        description:
          "Python-based YOLO detection was removed from the Rust-only desktop build.",
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
          AI detection is not available in the Rust-only desktop build yet
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
