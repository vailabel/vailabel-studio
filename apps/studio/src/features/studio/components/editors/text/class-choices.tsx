import { memo } from "react"
import { Check, Tags } from "lucide-react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import type { Label } from "@/shared/types/core"

interface ClassChoicesProps {
  labels: Label[]
  /** Names of the currently-applied classes. */
  selected: Set<string>
  title: string
  multiple: boolean
  onToggle: (label: Label) => void
  onClear: () => void
}

// Whole-document class bar for text classification (single) and taxonomy
// (multi). A choices control like Label Studio's, shown over the document.
export const ClassChoices = memo(
  ({ labels, selected, title, multiple, onToggle, onClear }: ClassChoicesProps) => (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Tags className="size-4 text-muted-foreground" />
            {title}
            {multiple && (
              <span className="text-xs font-normal text-muted-foreground">
                (choose any)
              </span>
            )}
          </span>
          {selected.size > 0 && (
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
            No classes yet — add classes to the project to start labeling.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const isSelected = selected.has(label.name)
              return (
                <button
                  key={label.id}
                  onClick={() => onToggle(label)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    isSelected
                      ? "border-transparent font-medium text-white"
                      : "hover:bg-muted"
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: label.color }
                      : {
                          backgroundColor: rgbToRgba(label.color, 0.12),
                          borderColor: label.color,
                        }
                  }
                >
                  {isSelected && <Check className="size-3.5" />}
                  {label.name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
)

ClassChoices.displayName = "ClassChoices"
