import { memo } from "react"
import { Check, Tags } from "lucide-react"
import { cn, rgbToRgba } from "@/lib/utils"
import type { Annotation, Label } from "@/types/core"

interface ClassificationPanelProps {
  labels: Label[]
  /** The current image's classification annotation, if any. */
  active?: Annotation
  onAssign: (label: Label) => void
  onClear: () => void
}

// Whole-image class assignment for Classification projects — shown as a choices
// bar over the canvas (Label Studio "Choices" control).
export const ClassificationPanel = memo(
  ({ labels, active, onAssign, onClear }: ClassificationPanelProps) => {
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Tags className="size-4 text-muted-foreground" />
              Image class
            </span>
            {active && (
              <button
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {labels.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No classes yet — add classes to the project to start classifying.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const selected = active?.name === label.name
                return (
                  <button
                    key={label.id}
                    onClick={() => onAssign(label)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                      selected
                        ? "border-transparent font-medium text-white"
                        : "hover:bg-muted"
                    )}
                    style={
                      selected
                        ? { backgroundColor: label.color }
                        : {
                            backgroundColor: rgbToRgba(label.color, 0.12),
                            borderColor: label.color,
                          }
                    }
                  >
                    {selected && <Check className="size-3.5" />}
                    {label.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
)

ClassificationPanel.displayName = "ClassificationPanel"
