"use client"

import { useRef, useEffect, memo, useMemo } from "react"
import {
  Square,
  OctagonIcon as Polygon,
  Move,
  Trash2,
  ZoomIn,
  Pencil,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { ImageData } from "@/types/core"
import type { CanvasTool } from "@/features/studio/types"

interface ContextMenuProps {
  x: number
  y: number
  containerRect: DOMRect | null
  image: ImageData | null
  selectedModelId?: string
  selectedModelCanAttemptPrediction?: boolean
  selectedModelUnsupportedReason?: string
  onGeneratePredictions: (modelId: string) => Promise<unknown>
  onOpenAISettings?: () => void
  onSelectTool: (tool: CanvasTool) => void
  onResetView: () => void
  onClose: () => void
}

export const ContextMenu = memo(
  ({
    x,
    y,
    containerRect,
    image,
    selectedModelId,
    selectedModelCanAttemptPrediction = false,
    selectedModelUnsupportedReason,
    onGeneratePredictions,
    onOpenAISettings,
    onSelectTool,
    onResetView,
    onClose,
  }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          onClose()
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    const handleToolSelect = (tool: CanvasTool) => {
      onSelectTool(tool)
      onClose()
    }

    const handleAIDetection = async () => {
      if (!image) {
        toast({
          title: "No image selected",
          description: "Please select an image first.",
          variant: "destructive",
        })
        onClose()
        return
      }

      if (!selectedModelId) {
        toast({
          title: "Select a model first",
          description: "Choose a local AI model before running AI detect.",
        })
        onOpenAISettings?.()
        onClose()
        return
      }

      if (!selectedModelCanAttemptPrediction) {
        toast({
          title: "Selected model is not ready",
          description:
            selectedModelUnsupportedReason ||
            "Choose a detection-ready local model before running AI detect.",
          variant: "destructive",
        })
        onOpenAISettings?.()
        onClose()
        return
      }

      try {
        await onGeneratePredictions(selectedModelId)
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
        onClose()
      }
    }

    const menuPosition = useMemo(() => {
      const menuX = containerRect ? Math.max(0, x - containerRect.left) : x
      const menuY = containerRect ? Math.max(0, y - containerRect.top) : y
      const adjustedX = Math.min(
        menuX,
        (containerRect?.width || window.innerWidth) - 200
      )
      const adjustedY = Math.min(
        menuY,
        (containerRect?.height || window.innerHeight) - 250
      )

      return { x: adjustedX, y: adjustedY }
    }, [containerRect, x, y])

    return (
      <div
        ref={menuRef}
        className={cn(
          "absolute z-50 w-48 rounded-md border border-border bg-background shadow-lg ring-1 ring-opacity-5 transition-all duration-200 animate-in fade-in zoom-in-95"
        )}
        style={{ left: menuPosition.x, top: menuPosition.y }}
      >
        <div className="py-1">
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => {
              void handleAIDetection()
            }}
          >
            <Brain className="mr-2 h-4 w-4" />
            AI Detection
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("move")}
          >
            <Move className="mr-2 h-4 w-4" />
            Move
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("box")}
          >
            <Square className="mr-2 h-4 w-4" />
            Draw Box
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("polygon")}
          >
            <Polygon className="mr-2 h-4 w-4" />
            Draw Polygon
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("freeDraw")}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Free Draw
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("delete")}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </button>
          <div className="my-1 border-t border-border"></div>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => {
              onResetView()
              onClose()
            }}
          >
            <ZoomIn className="mr-2 h-4 w-4" />
            Reset Zoom
          </button>
        </div>
      </div>
    )
  }
)

ContextMenu.displayName = "ContextMenu"
