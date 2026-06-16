import { memo } from "react"
import { cn } from "@/shared/lib/utils"
import type { Label } from "@/shared/types/core"

interface FloatingLabelMenuProps {
  x: number
  y: number
  labels: Label[]
  activeLabelId?: string | null
  emptyHint?: string
  onPick: (label: Label) => void
  onDismiss: () => void
}

// A small label picker pinned at viewport coordinates (used for span labeling
// and relation typing). Renders a full-screen dismiss layer behind it.
export const FloatingLabelMenu = memo(
  ({
    x,
    y,
    labels,
    activeLabelId,
    emptyHint = "Add a class first.",
    onPick,
    onDismiss,
  }: FloatingLabelMenuProps) => (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onDismiss} />
      <div
        className="fixed z-50 flex max-w-xs flex-wrap gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg"
        style={{ left: x, top: y }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {labels.length === 0 ? (
          <span className="px-2 py-1 text-xs text-muted-foreground">
            {emptyHint}
          </span>
        ) : (
          labels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => onPick(label)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted",
                activeLabelId === label.id && "ring-1 ring-primary"
              )}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </button>
          ))
        )}
      </div>
    </>
  )
)

FloatingLabelMenu.displayName = "FloatingLabelMenu"
