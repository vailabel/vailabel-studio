import React, { memo, useMemo } from "react"
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
  Dot,
  Slash,
  Spline,
  Circle,
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
import { AIDetectionButton } from "@/components/ai/ai-detection-button"
import type { AIModel, ImageData } from "@/types/core"
import type { CanvasTool } from "@/features/studio/types"

interface ToolbarProps {
  currentImage: ImageData | null
  selectedTool: CanvasTool
  onSelectTool: (tool: CanvasTool) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  showCrosshair: boolean
  showCoordinates: boolean
  onToggleCrosshair: () => void | Promise<void>
  onToggleCoordinates: () => void | Promise<void>
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void | Promise<void>
  onRedo: () => void | Promise<void>
  selectedModel: AIModel | null
  selectedModelId?: string
  selectedModelPredictionReady: boolean
  selectedModelCanAttemptPrediction: boolean
  selectedModelWillConvertOnRun: boolean
  selectedModelUnsupportedReason?: string
  selectedModelReadinessLabel: string
  onOpenAISettings: () => void
  onGeneratePredictions: (modelId: string) => Promise<unknown>
  isGeneratingPredictions?: boolean
}

interface ToolButtonConfig {
  id: CanvasTool
  name: string
  icon: React.ElementType
  shortcut: string
}

interface UtilityButtonConfig {
  id: string
  name: string
  icon: React.ElementType
  shortcut: string
  active?: boolean
  disabled?: boolean
  onClick: () => void | Promise<void>
}

const annotationTools: ToolButtonConfig[] = [
  { id: "move", name: "Move", icon: Move, shortcut: "M" },
  { id: "box", name: "Draw Box", icon: Square, shortcut: "B" },
  { id: "polygon", name: "Draw Polygon", icon: Polygon, shortcut: "P" },
  { id: "freeDraw", name: "Free Draw", icon: Pencil, shortcut: "F" },
  { id: "point", name: "Point", icon: Dot, shortcut: "O" },
  { id: "line", name: "Line", icon: Slash, shortcut: "L" },
  { id: "linestrip", name: "Line Strip", icon: Spline, shortcut: "S" },
  { id: "circle", name: "Circle", icon: Circle, shortcut: "C" },
  { id: "delete", name: "Delete", icon: Trash2, shortcut: "D" },
]

export const Toolbar = memo(
  ({
    currentImage,
    selectedTool,
    onSelectTool,
    zoom,
    onZoomIn,
    onZoomOut,
    onResetView,
    showCrosshair,
    showCoordinates,
    onToggleCrosshair,
    onToggleCoordinates,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedModel,
    selectedModelId,
    selectedModelPredictionReady,
    selectedModelCanAttemptPrediction,
    selectedModelWillConvertOnRun,
    selectedModelUnsupportedReason,
    selectedModelReadinessLabel,
    onOpenAISettings,
    onGeneratePredictions,
    isGeneratingPredictions = false,
  }: ToolbarProps) => {
    const utilityButtons = useMemo<UtilityButtonConfig[]>(
      () => [
        {
          id: "undo",
          name: "Undo",
          icon: RotateCcw,
          shortcut: "Cmd+Z",
          disabled: !canUndo,
          onClick: onUndo,
        },
        {
          id: "redo",
          name: "Redo",
          icon: RotateCw,
          shortcut: "Cmd+Shift+Z",
          disabled: !canRedo,
          onClick: onRedo,
        },
      ],
      [canRedo, canUndo, onRedo, onUndo]
    )

    const displayButtons = useMemo<UtilityButtonConfig[]>(
      () => [
        {
          id: "crosshair",
          name: "Crosshair",
          icon: Crosshair,
          shortcut: "C",
          active: showCrosshair,
          onClick: onToggleCrosshair,
        },
        {
          id: "coordinates",
          name: "Coordinates",
          icon: MousePointer,
          shortcut: "Alt+Shift+C",
          active: showCoordinates,
          onClick: onToggleCoordinates,
        },
      ],
      [
        onToggleCoordinates,
        onToggleCrosshair,
        showCoordinates,
        showCrosshair,
      ]
    )

    return (
      <div className="flex items-center justify-between border-b bg-background p-1 border-border">
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            {annotationTools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "relative h-8 w-8 transition-all duration-200",
                        selectedTool === tool.id &&
                          "border-2 border-primary bg-primary/10 text-primary"
                      )}
                      onClick={() => onSelectTool(tool.id)}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>{tool.name}</span>
                    <kbd className="ml-2 rounded border border-border bg-muted px-1.5 text-xs">
                      {tool.shortcut}
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}

            <Separator orientation="vertical" className="mx-2 h-6" />

            {utilityButtons.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={tool.disabled}
                      className="relative h-8 w-8 hover:bg-muted"
                      onClick={() => {
                        void tool.onClick()
                      }}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>{tool.name}</span>
                    <kbd className="ml-2 rounded border border-border bg-muted px-1.5 text-xs">
                      {tool.shortcut}
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 w-8" onClick={onZoomOut}>
                    <Minus className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">Zoom Out</TooltipContent>
            </Tooltip>
            <p className="text-sm text-foreground">{(zoom * 100).toFixed(0)}%</p>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 w-8" onClick={onZoomIn}>
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onResetView}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">Reset Zoom</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="mx-2 h-6" />

          <TooltipProvider>
            {displayButtons.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8",
                        tool.active
                          ? "border-2 border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        void tool.onClick()
                      }}
                      aria-pressed={tool.active}
                    >
                      <tool.icon
                        className={cn("h-4 w-4", tool.active ? "scale-110" : "")}
                      />
                      {tool.active ? (
                        <span className="absolute right-1 top-1 block h-2 w-2 animate-pulse rounded-full bg-primary" />
                      ) : null}
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>{tool.name}</span>
                    <kbd className="ml-2 rounded border border-border bg-muted px-1.5 text-xs">
                      {tool.shortcut}
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {selectedModel ? (
            <div className="hidden items-center space-x-2 text-xs text-muted-foreground md:flex">
              <span>
                Model:{" "}
                <span className="font-medium text-foreground">
                  {selectedModel.name}
                </span>
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                {selectedModel.modelVersion ||
                  selectedModel.model_version ||
                  selectedModel.version}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {selectedModel.backend?.toUpperCase() || "CPU"}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                {selectedModelReadinessLabel}
              </span>
              {selectedModel.status ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  {selectedModel.status}
                </span>
              ) : null}
            </div>
          ) : null}

          <AIDetectionButton
            image={currentImage}
            selectedModelId={selectedModelId}
            selectedModelName={selectedModel?.name}
            selectedModelPredictionReady={selectedModelPredictionReady}
            selectedModelCanAttemptPrediction={selectedModelCanAttemptPrediction}
            selectedModelWillConvertOnRun={selectedModelWillConvertOnRun}
            selectedModelUnsupportedReason={selectedModelUnsupportedReason}
            isGenerating={isGeneratingPredictions}
            onOpenModelSettings={onOpenAISettings}
            onGeneratePredictions={onGeneratePredictions}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onOpenAISettings}>
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">AI Model Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }
)

Toolbar.displayName = "Toolbar"
