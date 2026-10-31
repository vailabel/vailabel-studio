import { memo, useMemo } from "react"
import {
  RotateCcw,
  RotateCw,
  Crosshair,
  MousePointer,
  Plus,
  Minus,
  RefreshCcw,
  Ruler,
  Keyboard,
} from "lucide-react"
import type { Label } from "@/shared/types/core"
import { ActiveClassPicker } from "@/features/studio/components/classes/active-class-picker"
import {
  AutoLabelButton,
  type DetectorChoice,
} from "@/features/studio/components/ai/auto-label-button"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import { Separator } from "@/shared/ui/separator"

// Keycap badge inside tooltips. The tooltip is `bg-foreground text-background`,
// so a plain `bg-muted` kbd inherits `text-background` and renders invisibly
// (light-on-light / dark-on-dark). These classes use the tooltip's own text
// color so the shortcut is always legible in both themes.
const KBD_CLASS =
  "ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background"

interface ToolbarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  showCrosshair: boolean
  showCoordinates: boolean
  showRuler: boolean
  onToggleCrosshair: () => void | Promise<void>
  onToggleCoordinates: () => void | Promise<void>
  onToggleRuler: () => void | Promise<void>
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void | Promise<void>
  onRedo: () => void | Promise<void>
  /** Active-class picker (omit `labels` to hide it). */
  labels?: Label[]
  activeLabelId?: string | null
  onActiveLabelChange?: (labelId: string | null) => void
  /** AI auto-label (omit `onAutoLabel` to hide it). */
  detectors?: DetectorChoice[]
  isAutoLabeling?: boolean
  canAutoLabel?: boolean
  onAutoLabel?: (modelId: string, threshold: number) => void | Promise<void>
  /** Opens the keyboard-shortcuts sheet. */
  onShowShortcuts?: () => void
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

// The studio's top bar. The drawing tools live in the left ToolRail; this bar
// holds undo/redo, the class new shapes get, AI auto-label, zoom, the canvas
// display toggles, and the shortcuts sheet.
export const Toolbar = memo(
  ({
    zoom,
    onZoomIn,
    onZoomOut,
    onResetView,
    showCrosshair,
    showCoordinates,
    showRuler,
    onToggleCrosshair,
    onToggleCoordinates,
    onToggleRuler,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    labels,
    activeLabelId = null,
    onActiveLabelChange,
    detectors = [],
    isAutoLabeling = false,
    canAutoLabel = true,
    onAutoLabel,
    onShowShortcuts,
  }: ToolbarProps) => {
    const utilityButtons = useMemo<UtilityButtonConfig[]>(
      () => [
        {
          id: "undo",
          name: "Undo",
          icon: RotateCcw,
          shortcut: "Ctrl+Z",
          disabled: !canUndo,
          onClick: onUndo,
        },
        {
          id: "redo",
          name: "Redo",
          icon: RotateCw,
          shortcut: "Ctrl+Shift+Z",
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
          shortcut: "H",
          active: showCrosshair,
          onClick: onToggleCrosshair,
        },
        {
          id: "coordinates",
          name: "Coordinates",
          icon: MousePointer,
          shortcut: "X",
          active: showCoordinates,
          onClick: onToggleCoordinates,
        },
        {
          id: "ruler",
          name: "Ruler",
          icon: Ruler,
          shortcut: "R",
          active: showRuler,
          onClick: onToggleRuler,
        },
      ],
      [
        onToggleCoordinates,
        onToggleCrosshair,
        onToggleRuler,
        showCoordinates,
        showCrosshair,
        showRuler,
      ]
    )

    return (
      <div className="flex items-center justify-between border-b bg-background p-1 border-border">
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            {utilityButtons.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={tool.disabled}
                      className="relative h-8 w-8 hover:bg-muted"
                      aria-label={tool.name}
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
                    <kbd className={KBD_CLASS}>{tool.shortcut}</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          {labels && onActiveLabelChange ? (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <ActiveClassPicker
                labels={labels}
                activeLabelId={activeLabelId}
                onChange={onActiveLabelChange}
              />
            </>
          ) : null}

          {onAutoLabel ? (
            <AutoLabelButton
              models={detectors}
              isRunning={isAutoLabeling}
              disabled={!canAutoLabel}
              onRun={onAutoLabel}
            />
          ) : null}
        </div>

        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 w-8" onClick={onZoomOut} aria-label="Zoom out">
                    <Minus className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                <div className="flex items-center">
                  <span>Zoom out</span>
                  <kbd className={KBD_CLASS}>−</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
            <p className="w-11 text-center text-sm tabular-nums text-foreground">{(zoom * 100).toFixed(0)}%</p>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 w-8" onClick={onZoomIn} aria-label="Zoom in">
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                <div className="flex items-center">
                  <span>Zoom in</span>
                  <kbd className={KBD_CLASS}>+</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onResetView} aria-label="Fit image to screen">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">Fit image to screen</TooltipContent>
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
                      aria-label={tool.name}
                    >
                      <tool.icon className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>{tool.name}</span>
                    <kbd className={KBD_CLASS}>{tool.shortcut}</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          {onShowShortcuts ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 hover:bg-muted"
                      onClick={onShowShortcuts}
                      aria-label="Keyboard shortcuts"
                    >
                      <Keyboard className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <div className="flex items-center">
                    <span>Keyboard shortcuts</span>
                    <kbd className={KBD_CLASS}>?</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>
    )
  }
)

Toolbar.displayName = "Toolbar"
