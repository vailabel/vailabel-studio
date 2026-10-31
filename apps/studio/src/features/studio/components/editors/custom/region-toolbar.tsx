import { Brush, Circle, CircleDashed, Eraser, PenTool, Square } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { shapeTagOf } from "@/shared/lib/label-config/result"
import type { RegionTools } from "./region-tools"

const TOOL_ICON: Record<string, typeof Square> = {
  rectanglelabels: Square,
  polygonlabels: PenTool,
  ellipselabels: CircleDashed,
  keypointlabels: Circle,
  brushlabels: Brush,
}

const toolButton = (on: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
    on ? "bg-primary text-primary-foreground" : "hover:bg-muted"
  )

/** Tool tabs for picking which spatial control to draw with, plus brush size
 *  and eraser while a brush tool is active. */
export const RegionToolbar = ({ tools }: { tools: RegionTools }) => (
  <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-1.5">
    {tools.controls.length > 1 &&
      tools.controls.map((control, index) => {
        const Icon = TOOL_ICON[shapeTagOf(control.tag)] ?? Square
        return (
          <button
            key={control.name}
            type="button"
            onClick={() => tools.selectTool(index)}
            className={toolButton(index === tools.activeIndex)}
          >
            <Icon className="size-3.5" />
            {control.name}
          </button>
        )
      })}
    {tools.shape === "brushlabels" && (
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5">
          Size
          <input
            type="range"
            min={0.5}
            max={15}
            step={0.5}
            value={tools.brushSize}
            onChange={(event) => tools.setBrushSize(Number(event.target.value))}
            className="w-24"
            aria-label="Brush size"
          />
        </label>
        <button
          type="button"
          onClick={() => tools.setErasing(!tools.erasing)}
          className={toolButton(tools.erasing)}
          aria-pressed={tools.erasing}
        >
          <Eraser className="size-3.5" />
          Eraser
        </button>
      </div>
    )}
  </div>
)
