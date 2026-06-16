import { memo, useMemo } from "react"
import {
  Circle,
  Eye,
  EyeOff,
  Minus,
  MousePointer2,
  PenTool,
  Spline,
  Square,
  Trash2,
  Waypoints,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { ScrollArea } from "@/shared/ui/scroll-area"
import type { Annotation, Label } from "@/shared/types/core"
import {
  useHiddenRegions,
  useRegionVisibilityActions,
} from "@/features/studio/canvas-state/use-region-visibility"

// Shape-type icon, mirroring the drawing tools so a row reads at a glance.
const TYPE_ICON: Record<string, typeof Square> = {
  box: Square,
  polygon: PenTool,
  freeDraw: Spline,
  point: MousePointer2,
  line: Minus,
  linestrip: Waypoints,
  circle: Circle,
}

interface RegionsPanelProps {
  annotations: Annotation[]
  labels: Label[]
  selectedId: string | null
  onSelect: (annotation: Annotation) => void
  onDelete: (annotationId: string) => void
}

// Label-Studio-style Regions list: one row per drawn annotation on the current
// item, with show/hide (eye), delete (trash), and click-to-select that stays in
// sync with the canvas selection. The missing core of our right column.
export const RegionsPanel = memo(
  ({ annotations, labels, selectedId, onSelect, onDelete }: RegionsPanelProps) => {
    const hidden = useHiddenRegions()
    const { toggle } = useRegionVisibilityActions()

    // Resolve a display color per annotation: its own color, else its label's.
    const colorFor = useMemo(() => {
      const byName = new Map(labels.map((label) => [label.name, label.color]))
      return (annotation: Annotation) =>
        annotation.color || byName.get(annotation.name) || "#64748b"
    }, [labels])

    return (
      <div className="flex h-full min-h-0 flex-col bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Regions</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {annotations.length}
          </span>
        </div>

        {annotations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No regions yet. Draw on the image to add one.
          </p>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ul className="p-1">
              {annotations.map((annotation, index) => {
                const Icon = TYPE_ICON[annotation.type] ?? Square
                const isHidden = hidden.has(annotation.id)
                const isSelected = annotation.id === selectedId
                const color = colorFor(annotation)
                return (
                  <li key={annotation.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(annotation)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onSelect(annotation)
                        }
                      }}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
                        isSelected
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/40"
                          : "hover:bg-muted focus-visible:bg-muted",
                        isHidden && "opacity-50"
                      )}
                    >
                      <Icon
                        className="size-3.5 shrink-0"
                        style={{ color }}
                        aria-hidden
                      />
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {annotation.name || annotation.type}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggle(annotation.id)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={isHidden ? "Show region" : "Hide region"}
                        aria-pressed={isHidden}
                      >
                        {isHidden ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete(annotation.id)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete region"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    )
  }
)

RegionsPanel.displayName = "RegionsPanel"
