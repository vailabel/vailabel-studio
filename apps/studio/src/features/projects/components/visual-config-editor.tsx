import { memo, useState } from "react"
import { Plus, X, Trash2 } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/ui/native-select"
import { getRandomColor, cn } from "@/shared/lib/utils"
import type {
  ConfigChoice,
  ControlTag,
  LabelConfig,
} from "@/shared/lib/label-config/types"
import { isLabelBearing } from "@/shared/lib/label-config/generate"

// No-code builder over a LabelConfig. Edits are immutable; every change calls
// onChange with the next config, which the wrapper serializes back to the config
// string (the single source of truth). Mirrors Label Studio's "Visual" tab.

const CONTROL_LABELS: Record<string, string> = {
  rectanglelabels: "Bounding boxes",
  polygonlabels: "Polygons",
  keypointlabels: "Keypoints",
  ellipselabels: "Ellipses",
  brushlabels: "Brush masks",
  labels: "Labels",
  hypertextlabels: "HTML labels",
  paragraphlabels: "Paragraph labels",
  timeserieslabels: "Time-series labels",
  choices: "Choices",
  taxonomy: "Taxonomy",
  rating: "Rating",
  textarea: "Text area",
  number: "Number",
  relations: "Relations",
  pairwise: "Pairwise (A/B)",
}

const OBJECT_OPTIONS = [
  { tag: "image", label: "Image" },
  { tag: "text", label: "Text" },
  { tag: "audio", label: "Audio" },
] as const

// Controls offered by the "Add" row, per primary object type.
const ADD_MENU: Record<string, { kind: string; label: string }[]> = {
  image: [
    { kind: "rectanglelabels", label: "Boxes" },
    { kind: "polygonlabels", label: "Polygons" },
    { kind: "keypointlabels", label: "Keypoints" },
    { kind: "choices", label: "Choices" },
    { kind: "rating", label: "Rating" },
    { kind: "textarea", label: "Text" },
  ],
  text: [
    { kind: "labels", label: "Spans" },
    { kind: "choices", label: "Choices" },
    { kind: "taxonomy", label: "Taxonomy" },
    { kind: "rating", label: "Rating" },
    { kind: "textarea", label: "Text" },
    { kind: "relations", label: "Relations" },
  ],
  audio: [
    { kind: "labels", label: "Segments" },
    { kind: "choices", label: "Choices" },
    { kind: "rating", label: "Rating" },
    { kind: "textarea", label: "Text" },
  ],
}

export const VisualConfigEditor = memo(
  ({
    config,
    onChange,
  }: {
    config: LabelConfig
    onChange: (next: LabelConfig) => void
  }) => {
    const primary =
      config.objects.find((object) =>
        ["image", "text", "audio"].includes(object.tag)
      ) ?? config.objects[0]

    const setObjectTag = (tag: string) => {
      if (!primary) return
      onChange({
        ...config,
        objects: config.objects.map((object) =>
          object === primary ? { ...object, tag, value: `$${tag}` } : object
        ),
      })
    }

    const updateControl = (index: number, next: ControlTag) =>
      onChange({
        ...config,
        controls: config.controls.map((control, i) =>
          i === index ? next : control
        ),
      })

    const removeControl = (index: number) =>
      onChange({
        ...config,
        controls: config.controls.filter((_, i) => i !== index),
      })

    const addControl = (kind: string) => {
      const existing = config.controls.map((control) => control.name)
      onChange({
        ...config,
        controls: [
          ...config.controls,
          makeControl(kind, primary?.name ?? "image", existing),
        ],
      })
    }

    const menu = ADD_MENU[primary?.tag ?? "image"] ?? ADD_MENU.image

    return (
      <div className="flex flex-col gap-3">
        {/* Data object */}
        <section className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Data</p>
              <p className="text-xs text-muted-foreground">
                What the annotator sees
              </p>
            </div>
            <NativeSelect
              size="sm"
              value={primary?.tag ?? "image"}
              onChange={(event) => setObjectTag(event.target.value)}
            >
              {OBJECT_OPTIONS.map((option) => (
                <NativeSelectOption key={option.tag} value={option.tag}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </section>

        {/* Controls */}
        {config.controls.map((control, index) => (
          <ControlCard
            key={`${control.name}-${index}`}
            control={control}
            onChange={(next) => updateControl(index, next)}
            onRemove={() => removeControl(index)}
          />
        ))}

        {config.controls.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No controls yet. Add one below.
          </p>
        )}

        {/* Add control */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Add:</span>
          {menu.map((item) => (
            <Button
              key={item.kind}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => addControl(item.kind)}
            >
              <Plus className="size-3" />
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }
)

VisualConfigEditor.displayName = "VisualConfigEditor"

// ── one control ───────────────────────────────────────────────────────────────
const ControlCard = memo(
  ({
    control,
    onChange,
    onRemove,
  }: {
    control: ControlTag
    onChange: (next: ControlTag) => void
    onRemove: () => void
  }) => {
    const title = CONTROL_LABELS[control.tag] ?? control.tag
    const labelBearing = isLabelBearing(control)

    return (
      <section className="rounded-lg border border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {control.name}
            </code>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {labelBearing && (
          <LabelsEditor
            choices={control.choices}
            onChange={(choices) => onChange({ ...control, choices })}
          />
        )}

        {control.tag === "choices" && (
          <SingleMultipleToggle
            value={control.attrs.choice === "multiple" ? "multiple" : "single"}
            onChange={(mode) =>
              onChange({ ...control, attrs: { ...control.attrs, choice: mode } })
            }
          />
        )}

        {control.tag === "rating" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Max</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={control.attrs.maxrating ?? "5"}
              onChange={(event) =>
                onChange({
                  ...control,
                  attrs: { ...control.attrs, maxrating: event.target.value },
                })
              }
              className="h-8 w-20"
            />
          </div>
        )}

        {(control.tag === "textarea" ||
          control.tag === "number" ||
          control.tag === "relations") && (
          <p className="text-xs text-muted-foreground">
            {control.tag === "relations"
              ? "Lets annotators link regions together."
              : "Free-form input — no labels to configure."}
          </p>
        )}
      </section>
    )
  }
)

ControlCard.displayName = "ControlCard"

// ── label/choice list ─────────────────────────────────────────────────────────
const LabelsEditor = memo(
  ({
    choices,
    onChange,
  }: {
    choices: ConfigChoice[]
    onChange: (next: ConfigChoice[]) => void
  }) => {
    const [name, setName] = useState("")
    const [color, setColor] = useState(() => getRandomColor())

    const add = () => {
      const value = name.trim()
      if (!value) return
      if (choices.some((choice) => choice.value.toLowerCase() === value.toLowerCase()))
        return
      onChange([...choices, { value, background: color }])
      setName("")
      setColor(getRandomColor())
    }

    return (
      <div className="flex flex-col gap-2">
        {choices.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {choices.map((choice, index) => (
              <span
                key={choice.value}
                className="inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-1 pr-1.5 text-sm"
              >
                <input
                  type="color"
                  value={choice.background ?? "#64748b"}
                  onChange={(event) =>
                    onChange(
                      choices.map((entry, i) =>
                        i === index
                          ? { ...entry, background: event.target.value }
                          : entry
                      )
                    )
                  }
                  aria-label={`Color for ${choice.value}`}
                  className="size-5 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
                {choice.value}
                <button
                  type="button"
                  onClick={() =>
                    onChange(choices.filter((_, i) => i !== index))
                  }
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${choice.value}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="New label color"
            className="size-8 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                add()
              }
            }}
            placeholder="Add a label, press Enter"
            className="h-8"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={add}
            disabled={!name.trim()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    )
  }
)

LabelsEditor.displayName = "LabelsEditor"

const SingleMultipleToggle = memo(
  ({
    value,
    onChange,
  }: {
    value: "single" | "multiple"
    onChange: (mode: "single" | "multiple") => void
  }) => (
    <div className="mt-2 inline-flex rounded-md border border-border p-0.5 text-xs">
      {(["single", "multiple"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "rounded px-2 py-0.5 capitalize transition-colors",
            value === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  )
)

SingleMultipleToggle.displayName = "SingleMultipleToggle"

// ── new-control factory ───────────────────────────────────────────────────────
function makeControl(
  kind: string,
  objectName: string,
  existingNames: string[]
): ControlTag {
  const base: Record<string, { name: string; choices?: ConfigChoice[]; attrs?: Record<string, string> }> = {
    rectanglelabels: { name: "label", choices: [{ value: "Label", background: "#f97316" }] },
    polygonlabels: { name: "label", choices: [{ value: "Label", background: "#f97316" }] },
    keypointlabels: { name: "label", choices: [{ value: "Point", background: "#6366f1" }] },
    labels: { name: "label", choices: [{ value: "Label", background: "#ef4444" }] },
    choices: {
      name: "choice",
      choices: [{ value: "Option 1" }, { value: "Option 2" }],
      attrs: { choice: "single" },
    },
    taxonomy: { name: "tags", choices: [{ value: "Topic 1" }] },
    rating: { name: "rating", attrs: { maxrating: "5" } },
    textarea: { name: "notes" },
    number: { name: "number" },
    relations: { name: "relation" },
  }
  const spec = base[kind] ?? { name: kind }
  const name = uniqueName(spec.name, existingNames)
  return {
    tag: kind,
    name,
    toName: objectName,
    toNames: [objectName],
    choices: spec.choices ?? [],
    attrs: spec.attrs ?? {},
  }
}

function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base
  let n = 2
  while (existing.includes(`${base}${n}`)) n++
  return `${base}${n}`
}
