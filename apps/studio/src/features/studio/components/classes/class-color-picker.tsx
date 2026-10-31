import { memo, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { PALETTE_COLORS } from "@/features/studio/model/lib/label-palette"

interface ClassColorPickerProps {
  color: string
  onChange: (color: string) => void
  /** Accessible name for the trigger swatch. */
  label?: string
  size?: "sm" | "md"
  disabled?: boolean
}

/**
 * A color swatch that opens a small palette of distinct class colors (plus a
 * custom picker). Used wherever a class gets its color: the new-class form, the
 * class row's recolor action, and the class picker after drawing.
 */
export const ClassColorPicker = memo(
  ({
    color,
    onChange,
    label = "Class color",
    size = "md",
    disabled,
  }: ClassColorPickerProps) => {
    const [open, setOpen] = useState(false)
    const swatchSize = size === "sm" ? "size-4" : "size-6"

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              aria-label={label}
              title={label}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "flex-shrink-0 rounded-full border-2 border-background shadow-sm ring-1 ring-border hover:ring-2 hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
                swatchSize
              )}
              style={{ backgroundColor: color }}
            />
          }
        />
        <PopoverContent
          align="start"
          className="w-auto gap-2 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grid grid-cols-6 gap-1.5">
            {PALETTE_COLORS.map((swatch) => {
              const selected = swatch.toLowerCase() === color.toLowerCase()
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Use color ${swatch}`}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(swatch)
                    setOpen(false)
                  }}
                  className="flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-popover hover:ring-2 hover:ring-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{ backgroundColor: swatch }}
                >
                  {selected ? <Check className="size-3.5 text-white" /> : null}
                </button>
              )
            })}
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted">
            Custom color
            <input
              type="color"
              value={toHexColor(color)}
              onChange={(event) => onChange(event.target.value)}
              className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </PopoverContent>
      </Popover>
    )
  }
)

ClassColorPicker.displayName = "ClassColorPicker"

/** `<input type="color">` only accepts #rrggbb; convert rgb()/short hex for it. */
function toHexColor(color: string): string {
  const value = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${[...value.slice(1)].map((c) => c + c).join("")}`
  }
  const rgb = value.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (rgb) {
    return `#${rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("")}`
  }
  return "#64748b"
}
