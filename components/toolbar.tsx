"use client"

import type React from "react"

import { motion } from "framer-motion"
import {
  Square,
  OctagonIcon as Polygon,
  Move,
  Trash2,
  MousePointer,
  RotateCcw,
  Ruler,
  Crosshair,
  Pencil,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/lib/settings-store"
import { AIDetectionButton } from "@/components/ai-detection-button"
import type { ImageData } from "@/lib/types"

interface ToolbarProps {
  currentImage: ImageData | null
  onOpenSettings: () => void
  onOpenAISettings: () => void
}

interface Tool {
  id: string
  name: string
  icon: React.ElementType
  shortcut: string
}

export function Toolbar({ currentImage, onOpenSettings, onOpenAISettings }: ToolbarProps) {
  const {
    selectedTool,
    setSelectedTool,
    showRulers,
    setShowRulers,
    showCrosshairs,
    setShowCrosshairs,
    showCoordinates,
    setShowCoordinates,
    darkMode,
  } = useSettingsStore()

  const tools: Tool[] = [
    { id: "move", name: "Move", icon: Move, shortcut: "M" },
    { id: "box", name: "Draw Box", icon: Square, shortcut: "B" },
    { id: "polygon", name: "Draw Polygon", icon: Polygon, shortcut: "P" },
    { id: "freeDraw", name: "Free Draw", icon: Pencil, shortcut: "F" },
    { id: "delete", name: "Delete", icon: Trash2, shortcut: "D" },
  ]

  const handleResetView = () => {
    // This will be handled by the Canvas component
    const resetEvent = new CustomEvent("reset-canvas-view")
    window.dispatchEvent(resetEvent)
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b p-2",
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
      )}
    >
      <div className="flex items-center space-x-1">
        <TooltipProvider>
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "relative h-8 w-8",
                    selectedTool === tool.id && (darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-50 text-blue-500"),
                  )}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                  {selectedTool === tool.id && (
                    <motion.div
                      layoutId="active-tool"
                      className={cn(
                        "absolute inset-0 rounded-md border-2",
                        darkMode ? "border-blue-400" : "border-blue-500",
                      )}
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center">
                  <span>{tool.name}</span>
                  <kbd
                    className={cn(
                      "ml-2 rounded border px-1.5 text-xs",
                      darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-100",
                    )}
                  >
                    {tool.shortcut}
                  </kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      <Separator orientation="vertical" className={cn("mx-2 h-6", darkMode ? "bg-gray-700" : "")} />

      <div className="flex items-center space-x-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8" onClick={handleResetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset View (0)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8",
                  showRulers && (darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-50 text-blue-500"),
                )}
                onClick={() => setShowRulers(!showRulers)}
              >
                <Ruler className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle Rulers (R)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8",
                  showCrosshairs && (darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-50 text-blue-500"),
                )}
                onClick={() => setShowCrosshairs(!showCrosshairs)}
              >
                <Crosshair className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle Crosshairs (C)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8",
                  showCoordinates && (darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-50 text-blue-500"),
                )}
                onClick={() => setShowCoordinates(!showCoordinates)}
              >
                <MousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle Coordinates</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className={cn("mx-2 h-6", darkMode ? "bg-gray-700" : "")} />

        {/* AI Detection Button */}
        <AIDetectionButton image={currentImage} />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onOpenAISettings}>
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">AI Model Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
