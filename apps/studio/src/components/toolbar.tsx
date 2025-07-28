import React from "react"
import { motion } from "framer-motion"
import {
  Square,
  OctagonIcon as Polygon,
  Move,
  Trash2,
  MousePointer,
  RotateCcw,
  RotateCw,
  Crosshair,
  Pencil,
  Settings,
  Plus,
  Minus,
  RefreshCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { AIDetectionButton } from "@/components/ai-detection-button"
import type { ImageData } from "@vailabel/core"
import { useCanvasStore } from "@/stores/canvas-store"
import { useAnnotationsStore } from "@/stores/annotation-store"
import { memo } from "react"

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
  condition?: boolean
  action?: () => void
}

interface AdditionalTool {
  id: string
  name: string
  icon: React.ElementType
  shortcut: string
  active?: boolean
  action: () => void
}

export const Toolbar = memo(
  ({ currentImage, onOpenAISettings }: ToolbarProps) => {
    const {
      selectedTool,
      setSelectedTool,
      resetView,
      setZoom,
      zoom,
      setShowCrosshair,
      setShowCoordinates,
      showCrosshair,
      showCoordinates,
    } = useCanvasStore()
    const { undo, redo, canUndo, canRedo } = useAnnotationsStore()
    const selectedTools = React.useMemo(
      (): Tool[] => [
        {
          id: "move",
          name: "Move",
          icon: Move,
          shortcut: "M",
          action: () => setSelectedTool("move"),
        },
        {
          id: "box",
          name: "Draw Box",
          icon: Square,
          shortcut: "B",
          action: () => setSelectedTool("box"),
        },
        {
          id: "polygon",
          name: "Draw Polygon",
          icon: Polygon,
          shortcut: "P",
          action: () => setSelectedTool("polygon"),
        },
        {
          id: "freeDraw",
          name: "Free Draw",
          icon: Pencil,
          shortcut: "F",
          action: () => setSelectedTool("freeDraw"),
        },
        {
          id: "delete",
          name: "Delete",
          icon: Trash2,
          shortcut: "D",
          action: () => setSelectedTool("delete"),
        },
      ],
      [setSelectedTool]
    )

    const clickableTools = React.useMemo(
      (): Tool[] => [
        {
          id: "undo",
          name: "Undo",
          icon: RotateCcw,
          shortcut: "Cmd+Z",
          condition: canUndo,
          action: () => undo(),
        },
        {
          id: "redo",
          name: "Redo",
          icon: RotateCw,
          condition: canRedo,
          shortcut: "Cmd+Shift+Z",
          action: () => redo(),
        },
      ],
      [canUndo, canRedo, undo, redo]
    )

    const additionalTool = React.useMemo(
      (): AdditionalTool[] => [
        {
          id: "crosshair",
          name: "Crosshair",
          icon: Crosshair,
          shortcut: "C",
          active: showCrosshair,
          action: () => {
            setShowCrosshair(!showCrosshair)
          },
        },
        {
          id: "coordinates",
          name: "Coordinates",
          icon: MousePointer,
          shortcut: "Alt+Shift+C",
          active: showCoordinates,
          action: () => {
            setShowCoordinates(!showCoordinates)
          },
        },
      ],
      [showCrosshair, showCoordinates, setShowCrosshair, setShowCoordinates]
    )

    return (
      <div className="flex items-center justify-between border-b p-1 dark:bg-gray-800 dark:border-gray-700 bg-white border-gray-200">
        <AnnotationTools
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          clickableTools={clickableTools}
          selectedTools={selectedTools}
        />
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => setZoom(zoom - 0.1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom Out</TooltipContent>
            </Tooltip>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {(zoom * 100).toFixed(0)}%
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => setZoom(zoom + 0.1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => resetView()}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset Zoom</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator
            orientation="vertical"
            className="mx-2 h-6 dark:bg-gray-700"
          />
          <TooltipProvider>
            {additionalTool.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8",
                      tool.active
                        ? "bg-blue-50 text-blue-500 dark:bg-blue-900 dark:text-blue-300 border-2 border-blue-500 dark:border-blue-400 shadow"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    onClick={tool.action}
                    aria-pressed={tool.active}
                  >
                    <tool.icon
                      className={cn("h-4 w-4", tool.active ? "scale-110" : "")}
                    />
                    {tool.active && (
                      <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-300 animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>{tool.name}</span>
                    <kbd
                      className={cn(
                        "ml-2 rounded border px-1.5 text-xs",
                        "border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
                      )}
                    >
                      {tool.shortcut}
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          <Separator
            orientation="vertical"
            className="mx-2 h-6 dark:bg-gray-700"
          />
          <AIDetectionButton image={currentImage} />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  onClick={onOpenAISettings}
                >
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
)

type AnnotationToolsProps = {
  selectedTools: Tool[]
  selectedTool: string
  setSelectedTool: (tool: string) => void
  clickableTools: Tool[]
}

const AnnotationTools = memo(
  ({
    selectedTools,
    setSelectedTool,
    selectedTool,
    clickableTools,
  }: AnnotationToolsProps) => {
    return (
      <div className="flex items-center space-x-1">
        <TooltipProvider>
          {selectedTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "relative h-8 w-8",
                    selectedTool === tool.id &&
                      "bg-blue-50 text-blue-500 dark:bg-blue-900 dark:text-blue-300"
                  )}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                  {selectedTool === tool.id && (
                    <motion.div
                      layoutId="active-tool"
                      className={cn(
                        "absolute inset-0 rounded-md border-2",
                        "border-blue-500 dark:border-blue-400"
                      )}
                      initial={false}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
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
                      "border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
                    )}
                  >
                    {tool.shortcut}
                  </kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          <Separator
            orientation="vertical"
            className="mx-2 h-6 dark:bg-gray-700"
          />
          {clickableTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!tool.condition}
                  className={cn(
                    "relative h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => tool.action && tool.action()}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center">
                  <span>{tool.name}</span>
                  <kbd
                    className={cn(
                      "ml-2 rounded border px-1.5 text-xs",
                      "border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
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
    )
  }
)
