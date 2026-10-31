import { memo, useMemo } from "react"
import { Check, ChevronDown, MessageSquareDashed, Plus } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import type { Label } from "@/shared/types/core"
import { orderLabelsForPalette } from "@/features/studio/model/lib/label-palette"

interface ActiveClassPickerProps {
  labels: Label[]
  activeLabelId: string | null
  onChange: (labelId: string | null) => void
  /** Optional: jump to the Classes panel's "new class" form. */
  onCreateClass?: () => void
}

/**
 * Toolbar control that always shows which class new shapes will get — and lets
 * the user switch it without hunting for the side panel. "Ask each time" means
 * the class picker opens after every shape.
 */
export const ActiveClassPicker = memo(
  ({
    labels,
    activeLabelId,
    onChange,
    onCreateClass,
  }: ActiveClassPickerProps) => {
    const ordered = useMemo(() => orderLabelsForPalette(labels), [labels])
    const active = labels.find((label) => label.id === activeLabelId) ?? null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 max-w-52 gap-1.5 px-2",
                active && "border-primary/50 bg-primary/5"
              )}
              title="Class for new shapes (1–9 to switch, Esc to clear)"
            >
              {active ? (
                <span
                  className="size-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: active.color }}
                />
              ) : (
                <MessageSquareDashed className="size-3.5 text-muted-foreground" />
              )}
              <span className="truncate text-xs">
                {active ? active.name : "Ask after each shape"}
              </span>
              <ChevronDown className="size-3.5 flex-shrink-0 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="start"
          className="max-h-80 w-60 overflow-y-auto"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Class for new shapes
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onChange(null)}>
            <MessageSquareDashed className="size-4" />
            <span className="flex-1">Ask after each shape</span>
            {!active ? (
              <Check className="size-4" />
            ) : (
              <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
          {ordered.length > 0 ? <DropdownMenuSeparator /> : null}
          {ordered.map((label, index) => (
            <DropdownMenuItem key={label.id} onClick={() => onChange(label.id)}>
              <span
                className="size-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="min-w-0 flex-1 truncate">{label.name}</span>
              {label.id === activeLabelId ? (
                <Check className="size-4" />
              ) : index < 9 ? (
                <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
              ) : null}
            </DropdownMenuItem>
          ))}
          {onCreateClass ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCreateClass}>
                <Plus className="size-4" />
                New class…
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

ActiveClassPicker.displayName = "ActiveClassPicker"
