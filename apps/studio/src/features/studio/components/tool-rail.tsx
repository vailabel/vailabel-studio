import { Fragment, memo } from "react"
import { cn } from "@/shared/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import type { CanvasTool } from "@/features/studio/model/types"
import { TOOL_CATALOG } from "@/features/studio/components/tool-catalog"

// Tooltip keycap — see toolbar.tsx for why these specific classes are used.
const KBD_CLASS =
  "ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background"

interface ToolRailProps {
  /** Tools to expose for the current project template. Omit to show all. */
  allowedTools?: CanvasTool[]
  selectedTool: CanvasTool
  onSelectTool: (tool: CanvasTool) => void
}

// The vertical drawing-tool rail hugging the left edge of the canvas (Label
// Studio style). Tools are grouped (select · draw · AI · erase) with a divider
// between groups; each button shows its shortcut letter, and the tooltip says
// in one line how to use it — so a first-time user can pick the right tool
// without reading docs.
export const ToolRail = memo(
  ({ allowedTools, selectedTool, onSelectTool }: ToolRailProps) => {
    const tools = allowedTools
      ? TOOL_CATALOG.filter((tool) => allowedTools.includes(tool.id))
      : TOOL_CATALOG

    if (tools.length === 0) return null

    return (
      <div
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Drawing tools"
        className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-background py-2"
      >
        <TooltipProvider>
          {tools.map((tool, index) => {
            const isSelected = selectedTool === tool.id
            const startsGroup = index > 0 && tools[index - 1].group !== tool.group
            const isAi = tool.group === "ai"
            return (
              <Fragment key={tool.id}>
                {startsGroup ? (
                  <div className="my-1 h-px w-6 bg-border" aria-hidden="true" />
                ) : null}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isAi && "text-success",
                          isSelected &&
                            "bg-primary/10 text-primary ring-2 ring-primary hover:bg-primary/15"
                        )}
                        onClick={() => onSelectTool(tool.id)}
                        aria-label={`${tool.name} (${tool.shortcut})`}
                        aria-pressed={isSelected}
                      >
                        <tool.icon className="h-4 w-4" />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute bottom-0.5 right-0.5 text-[8px] font-semibold leading-none",
                            isSelected ? "text-primary" : "text-muted-foreground/80"
                          )}
                        >
                          {tool.shortcut}
                        </span>
                      </button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-60 flex-col items-start gap-0.5">
                    <div className="flex items-center font-medium">
                      <span>{tool.name}</span>
                      <kbd className={KBD_CLASS}>{tool.shortcut}</kbd>
                    </div>
                    <p className="text-xs opacity-80">{tool.description}</p>
                  </TooltipContent>
                </Tooltip>
              </Fragment>
            )
          })}
        </TooltipProvider>
      </div>
    )
  }
)

ToolRail.displayName = "ToolRail"
