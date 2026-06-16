import { memo } from "react"
import {
  Square,
  OctagonIcon as Polygon,
  Move,
  Trash2,
  Pencil,
  Dot,
  Slash,
  Spline,
  Circle,
  Wand2,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import type { CanvasTool } from "@/features/studio/model/types"

// Tooltip keycap — see toolbar.tsx for why these specific classes are used.
const KBD_CLASS =
  "ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background"

interface ToolConfig {
  id: CanvasTool
  name: string
  icon: React.ElementType
  shortcut: string
}

const annotationTools: ToolConfig[] = [
  { id: "move", name: "Move", icon: Move, shortcut: "M" },
  { id: "box", name: "Draw Box", icon: Square, shortcut: "B" },
  { id: "polygon", name: "Draw Polygon", icon: Polygon, shortcut: "P" },
  { id: "freeDraw", name: "Free Draw", icon: Pencil, shortcut: "F" },
  { id: "point", name: "Point", icon: Dot, shortcut: "O" },
  { id: "line", name: "Line", icon: Slash, shortcut: "L" },
  { id: "linestrip", name: "Line Strip", icon: Spline, shortcut: "S" },
  { id: "circle", name: "Circle", icon: Circle, shortcut: "C" },
  { id: "smartSegment", name: "Smart Segment (SAM)", icon: Wand2, shortcut: "G" },
  { id: "delete", name: "Delete", icon: Trash2, shortcut: "D" },
]

interface ToolRailProps {
  /** Tools to expose for the current project template. Omit to show all. */
  allowedTools?: CanvasTool[]
  selectedTool: CanvasTool
  onSelectTool: (tool: CanvasTool) => void
}

// The vertical drawing-tool rail hugging the left edge of the canvas (Label
// Studio style). View + history controls stay in the top toolbar; this rail is
// only the shape tools, so picking a tool reads like a paint program.
export const ToolRail = memo(
  ({ allowedTools, selectedTool, onSelectTool }: ToolRailProps) => {
    const tools = allowedTools
      ? annotationTools.filter((tool) => allowedTools.includes(tool.id))
      : annotationTools

    if (tools.length === 0) return null

    return (
      <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-2">
        <TooltipProvider>
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8",
                      selectedTool === tool.id &&
                        "border-2 border-primary bg-primary/10 text-primary"
                    )}
                    onClick={() => onSelectTool(tool.id)}
                    aria-pressed={selectedTool === tool.id}
                  >
                    <tool.icon className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent side="right">
                <div className="flex items-center">
                  <span>{tool.name}</span>
                  <kbd className={KBD_CLASS}>{tool.shortcut}</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    )
  }
)

ToolRail.displayName = "ToolRail"
