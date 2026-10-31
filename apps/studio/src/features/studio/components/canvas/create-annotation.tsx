import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CornerDownLeft, Plus, Sparkles, X } from "lucide-react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import { Input } from "@/shared/ui/input"
import { Checkbox } from "@/shared/ui/checkbox"
import type { Label } from "@/shared/types/core"
import {
  findLabelByName,
  nextPaletteColor,
  orderLabelsForPalette,
  type ClassSuggestion,
} from "@/features/studio/model/lib/label-palette"
import { ClassColorPicker } from "@/features/studio/components/classes/class-color-picker"

export interface CreateAnnotationSubmitOptions {
  /** Keep using this class for the next shapes (arms it as the active class). */
  remember: boolean
}

interface CreateAnnotationModalProps {
  onSubmit: (
    name: string,
    color: string,
    labelId: string | undefined,
    options: CreateAnnotationSubmitOptions
  ) => void | Promise<void>
  isOpen: boolean
  onClose: () => void
  labels: Label[]
  /** AI predictions overlapping the drawn shape, best first. */
  suggestions?: ClassSuggestion[]
  /** Shape type being labeled (for the title). */
  shapeType?: string
  /** Top-left position in the canvas container, next to the drawn shape. */
  position?: { left: number; top: number } | null
}

type Option =
  | { kind: "suggestion"; key: string; suggestion: ClassSuggestion }
  | { kind: "label"; key: string; label: Label; hotkey?: number }
  | { kind: "create"; key: string; name: string }

const REMEMBER_KEY = "studio.classPicker.remember"

function readRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1"
  } catch {
    return false
  }
}

function writeRemember(value: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? "1" : "0")
  } catch {
    // Storage unavailable (private mode) — the toggle still works for this session.
  }
}

const SHAPE_NAMES: Record<string, string> = {
  box: "box",
  polygon: "polygon",
  freeDraw: "shape",
  point: "point",
  line: "line",
  linestrip: "line",
  circle: "circle",
}

/**
 * The "what is this?" picker shown after drawing a shape when no class is
 * active. Keyboard-first: type to filter or create, ↑/↓ + Enter to choose,
 * 1–9 for the Nth class, Esc to discard the shape. AI suggestions (predictions
 * overlapping the shape) are offered first as one-click answers.
 */
export const CreateAnnotation = memo((props: Readonly<CreateAnnotationModalProps>) =>
  // Mounted only while open, so every shape starts with a fresh picker state.
  props.isOpen ? <ClassPicker {...props} /> : null
)

CreateAnnotation.displayName = "CreateAnnotation"

function ClassPicker({
    onSubmit,
    onClose,
    labels,
    suggestions = [],
    shapeType,
    position,
  }: Readonly<CreateAnnotationModalProps>) {
    const [query, setQuery] = useState("")
    const [rawHighlight, setHighlight] = useState(0)
    const [remember, setRemember] = useState(readRemember)
    const [newColor, setNewColor] = useState(() => nextPaletteColor(labels))
    const listRef = useRef<HTMLDivElement>(null)
    // Guards against a double Enter/click creating the shape twice while saving.
    const submittingRef = useRef(false)

    const ordered = useMemo(() => orderLabelsForPalette(labels), [labels])

    const options = useMemo<Option[]>(() => {
      const needle = query.trim().toLowerCase()
      const list: Option[] = []
      if (!needle) {
        suggestions.forEach((suggestion) =>
          list.push({ kind: "suggestion", key: `ai:${suggestion.name}`, suggestion })
        )
      }
      ordered.forEach((label, index) => {
        if (needle && !label.name.toLowerCase().includes(needle)) return
        list.push({
          kind: "label",
          key: label.id,
          label,
          hotkey: index < 9 ? index + 1 : undefined,
        })
      })
      if (needle && !findLabelByName(labels, query)) {
        list.push({ kind: "create", key: "create", name: query.trim() })
      }
      return list
    }, [labels, ordered, query, suggestions])

    const highlight = Math.min(rawHighlight, Math.max(0, options.length - 1))

    useEffect(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
        ?.scrollIntoView({ block: "nearest" })
    }, [highlight])

    const choose = useCallback(
      (option: Option | undefined) => {
        if (!option || submittingRef.current) return
        const opts = { remember }
        const submit = (name: string, color: string, labelId?: string) => {
          submittingRef.current = true
          void Promise.resolve(onSubmit(name, color, labelId, opts)).finally(() => {
            submittingRef.current = false
          })
        }
        switch (option.kind) {
          case "label":
            submit(option.label.name, option.label.color, option.label.id)
            return
          case "suggestion": {
            const { suggestion } = option
            submit(
              suggestion.label?.name ?? suggestion.name,
              suggestion.label?.color ?? suggestion.color ?? newColor,
              suggestion.label?.id
            )
            return
          }
          case "create":
            submit(option.name, newColor)
        }
      },
      [newColor, onSubmit, remember]
    )

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          setHighlight((current) => (options.length ? (current + 1) % options.length : 0))
          return
        case "ArrowUp":
          event.preventDefault()
          setHighlight((current) =>
            options.length ? (current - 1 + options.length) % options.length : 0
          )
          return
        case "Enter":
          event.preventDefault()
          choose(options[highlight])
          return
        case "Escape":
          event.preventDefault()
          onClose()
          return
      }
      // 1–9 with an empty box picks the Nth class, matching the palette hotkeys.
      if (!query && event.key >= "1" && event.key <= "9") {
        const label = ordered[Number(event.key) - 1]
        if (label) {
          event.preventDefault()
          choose({ kind: "label", key: label.id, label })
        }
      }
    }

    const shapeName = (shapeType && SHAPE_NAMES[shapeType]) || "shape"
    const hasSuggestions = suggestions.length > 0 && !query.trim()
    const firstLabelIndex = options.findIndex((option) => option.kind === "label")

    return (
      <div
        role="dialog"
        aria-label="Choose a class for this shape"
        className="absolute z-50 w-72 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xl"
        style={
          position
            ? { left: `${position.left}px`, top: `${position.top}px` }
            : { left: 8, top: 8 }
        }
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">What is this {shapeName}?</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Discard shape"
            title="Discard shape (Esc)"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlight(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder={labels.length ? "Search or type a new class" : "Type a class name, e.g. car"}
          aria-label="Class name"
          autoFocus
          className="h-8"
        />

        <div ref={listRef} className="mt-2 max-h-60 space-y-1 overflow-y-auto" role="listbox">
          {hasSuggestions ? (
            <p className="flex items-center gap-1 px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-success">
              <Sparkles className="size-3" /> AI suggests
            </p>
          ) : null}
          {options.map((option, index) => {
            const isHighlighted = index === highlight
            const showLabelHeader = hasSuggestions && index === firstLabelIndex
            return (
              <div key={option.key}>
                {showLabelHeader ? (
                  <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    All classes
                  </p>
                ) : null}
                <OptionRow
                  option={option}
                  index={index}
                  highlighted={isHighlighted}
                  newColor={newColor}
                  onNewColorChange={setNewColor}
                  onHover={() => setHighlight(index)}
                  onChoose={() => choose(option)}
                />
              </div>
            )
          })}
          {options.length === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-muted-foreground">
              Type a name to create your first class.
            </p>
          ) : null}
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <Checkbox
            checked={remember}
            onCheckedChange={(checked) => {
              const next = checked === true
              setRemember(next)
              writeRemember(next)
            }}
          />
          Keep using this class for the next shapes
        </label>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <span><Kbd>↑↓</Kbd> move</span>
          <span><Kbd>Enter</Kbd> choose</span>
          {labels.length ? <span><Kbd>1–9</Kbd> quick pick</span> : null}
          <span><Kbd>Esc</Kbd> discard</span>
        </p>
      </div>
    )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 font-semibold">{children}</kbd>
  )
}

function OptionRow({
  option,
  index,
  highlighted,
  newColor,
  onNewColorChange,
  onHover,
  onChoose,
}: {
  option: Option
  index: number
  highlighted: boolean
  newColor: string
  onNewColorChange: (color: string) => void
  onHover: () => void
  onChoose: () => void
}) {
  const base =
    "flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm"

  if (option.kind === "create") {
    return (
      <div
        role="option"
        aria-selected={highlighted}
        data-index={index}
        onMouseEnter={onHover}
        onClick={onChoose}
        className={cn(base, "border-dashed", highlighted ? "border-primary bg-primary/10" : "border-border")}
      >
        <ClassColorPicker
          size="sm"
          color={newColor}
          onChange={onNewColorChange}
          label="Color for the new class"
        />
        <Plus className="size-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          Create <strong>“{option.name}”</strong>
        </span>
        {highlighted ? <CornerDownLeft className="size-3.5 text-muted-foreground" /> : null}
      </div>
    )
  }

  const color =
    option.kind === "label"
      ? option.label.color
      : option.suggestion.color || "#22c55e"
  const name = option.kind === "label" ? option.label.name : option.suggestion.name

  return (
    <div
      role="option"
      aria-selected={highlighted}
      data-index={index}
      onMouseEnter={onHover}
      onClick={onChoose}
      className={cn(base, highlighted && "ring-2 ring-primary")}
      style={{
        backgroundColor: rgbToRgba(color, highlighted ? 0.22 : 0.1),
        borderColor: rgbToRgba(color, 0.6),
      }}
    >
      <span className="size-3 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      {option.kind === "suggestion" ? (
        <span className="flex flex-shrink-0 items-center gap-1 text-xs text-success">
          <Sparkles className="size-3" />
          {Math.round(option.suggestion.confidence * 100)}%
          {!option.suggestion.label ? (
            <span className="text-muted-foreground">· new</span>
          ) : null}
        </span>
      ) : option.hotkey ? (
        <kbd className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded border border-border bg-muted px-1 text-xs font-semibold text-muted-foreground">
          {option.hotkey}
        </kbd>
      ) : null}
    </div>
  )
}
