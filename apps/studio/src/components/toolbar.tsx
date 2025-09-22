import React from "react"
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
import { useCanvasTool, useCanvasZoom, useCanvasPan, useCanvasState } from "@/contexts/canvas-context"
import { memo, useCallback } from "react"

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
  const { selectedTool, setSelectedTool } = useCanvasTool()
  const { zoom, setZoom } = useCanvasZoom()
  const { resetView } = useCanvasPan()
  const { showCrosshair, showCoordinates } = useCanvasState(state => ({
    showCrosshair: state.showCrosshair,
    showCoordinates: state.showCoordinates
  }))
  // Note: Undo/Redo functionality would need to be implemented in the service layer
  const undo = useCallback(() => console.log("Undo not implemented yet"), [])
  const redo = useCallback(() => console.log("Redo not implemented yet"), [])
  const canUndo = false
  const canRedo = false
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
            // TODO: Implement crosshair toggle in Context
          },
        },
        {
          id: "coordinates",
          name: "Coordinates",
          icon: MousePointer,
          shortcut: "Alt+Shift+C",
          active: showCoordinates,
          action: () => {
            // TODO: Implement coordinates toggle in Context
          },
        },
      ],
      [showCrosshair, showCoordinates]
    )

    return (
      <div className="flex items-center justify-between border-b p-1 bg-background border-border">
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
            <p className="text-sm text-foreground">
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
            className="mx-2 h-6"
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
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={tool.action}
                    aria-pressed={tool.active}
                  >
                    <tool.icon
                      className={cn("h-4 w-4", tool.active ? "scale-110" : "")}
                    />
                    {tool.active && (
                      <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>{tool.name}</span>
                    <kbd
                      className={cn(
                        "ml-2 rounded border px-1.5 text-xs",
                        "border-border bg-muted"
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
            className="mx-2 h-6"
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
                    "relative h-8 w-8 transition-all duration-200",
                    selectedTool === tool.id &&
                      "bg-primary/10 text-primary border-2 border-primary"
                  )}
                  onClick={() => setSelectedTool(tool.id)}
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
                      "border-border bg-muted"
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
            className="mx-2 h-6"
          />
          {clickableTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!tool.condition}
                  className={cn(
                    "relative h-8 w-8 hover:bg-muted"
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
                      "border-border bg-muted"
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
