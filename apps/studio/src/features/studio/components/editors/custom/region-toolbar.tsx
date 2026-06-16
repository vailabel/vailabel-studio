import { Circle, PenTool, Square } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { ControlTag } from "@/shared/lib/label-config/types"

const TOOL_ICON: Record<string, typeof Square> = {
  rectanglelabels: Square,
  polygonlabels: PenTool,
  keypointlabels: Circle,
}

interface RegionToolbarProps {
  controls: ControlTag[]
  activeIndex: number
  onSelect: (index: number) => void
}

/** Tool tabs for picking which spatial control to draw with. */
export const RegionToolbar = ({
  controls,
  activeIndex,
  onSelect,
}: RegionToolbarProps) => (
  <div className="flex items-center gap-1 border-b border-border bg-card px-3 py-1.5">
    {controls.map((control, index) => {
      const Icon = TOOL_ICON[control.tag] ?? Square
      return (
        <button
          key={control.name}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            index === activeIndex
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <Icon className="size-3.5" />
          {control.name}
        </button>
      )
    })}
  </div>
)
