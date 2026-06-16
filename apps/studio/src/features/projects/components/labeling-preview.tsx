import { memo, useState } from "react"
import { ImageIcon, AudioLines, Link2 } from "lucide-react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import type { ControlTag, LabelConfig } from "@/shared/lib/label-config/types"
import {
  colorForChoice,
  isSpatialControl,
} from "@/shared/lib/label-config/config-helpers"
import {
  StandaloneControls,
  type ControlValueApi,
} from "@/shared/components/label-config/standalone-controls"

const SAMPLE_TEXT =
  "Acme Corp opened a new office in Paris, and Dr. Jane Smith will lead the research team starting next spring."

// A read-only-ish live preview of a labeling config, rendered with sample data —
// the create flow's answer to Label Studio's preview pane. Spatial controls show
// a labeled legend; whole-item controls reuse the real StandaloneControls widget
// backed by ephemeral local state so the preview is genuinely interactive.
export const LabelingPreview = memo(({ config }: { config: LabelConfig | null }) => {
  // Ephemeral result store so choices / rating / textarea are clickable here.
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>(
    {}
  )
  const api: ControlValueApi = {
    valueFor: (name) => values[name],
    onSet: (control, value) =>
      setValues((current) => ({ ...current, [control.name]: value })),
    onClear: (control) =>
      setValues((current) => {
        const next = { ...current }
        delete next[control.name]
        return next
      }),
  }

  if (!config || config.objects.length === 0) {
    return (
      <PreviewShell>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Add a data object (image, text, or audio) to preview the labeling
          interface.
        </div>
      </PreviewShell>
    )
  }

  const primary =
    config.objects.find((object) =>
      ["image", "text", "audio"].includes(object.tag)
    ) ?? config.objects[0]
  const spatial = config.controls.filter(
    (control) => isSpatialControl(control) && control.toName === primary.name
  )
  const standalone = config.controls.filter(
    (control) => !isSpatialControl(control) && control.tag !== "relations"
  )
  const hasRelations = config.controls.some(
    (control) => control.tag === "relations"
  )

  return (
    <PreviewShell>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {primary.tag === "image" && <ImagePreview spatial={spatial} />}
        {primary.tag === "text" && <TextPreview spatial={spatial} />}
        {primary.tag === "audio" && <AudioPreview spatial={spatial} />}

        {spatial.length > 0 && <Legend controls={spatial} />}

        {standalone.length > 0 && (
          <div className="rounded-lg border border-border">
            <StandaloneControls controls={standalone} api={api} />
          </div>
        )}

        {hasRelations && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <Link2 className="size-3.5" />
            Link regions together while labeling.
          </div>
        )}
      </div>
    </PreviewShell>
  )
})

LabelingPreview.displayName = "LabelingPreview"

const PreviewShell = memo(({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full min-h-[20rem] flex-col overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Preview
      </span>
      <span className="text-[11px] text-muted-foreground">sample data</span>
    </div>
    {children}
  </div>
))

PreviewShell.displayName = "PreviewShell"

// First choice color of the first spatial control (for the demo overlays).
function demoColor(spatial: ControlTag[], index: number): string {
  const control = spatial[0]
  if (!control || control.choices.length === 0) return "#6366f1"
  const choice = control.choices[index % control.choices.length]
  return colorForChoice(control, choice.value)
}

const ImagePreview = memo(({ spatial }: { spatial: ControlTag[] }) => (
  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted">
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
      <ImageIcon className="size-8 opacity-40" />
      <span className="text-xs">Sample image</span>
    </div>
    {spatial.length > 0 && (
      <>
        <DemoBox
          color={demoColor(spatial, 0)}
          label={spatial[0]?.choices[0]?.value}
          style={{ left: "12%", top: "20%", width: "34%", height: "45%" }}
        />
        {spatial[0]?.choices.length > 1 && (
          <DemoBox
            color={demoColor(spatial, 1)}
            label={spatial[0]?.choices[1]?.value}
            style={{ left: "55%", top: "38%", width: "30%", height: "40%" }}
          />
        )}
      </>
    )}
  </div>
))

ImagePreview.displayName = "ImagePreview"

const DemoBox = memo(
  ({
    color,
    label,
    style,
  }: {
    color: string
    label?: string
    style: React.CSSProperties
  }) => (
    <div
      className="absolute rounded-sm border-2"
      style={{ ...style, borderColor: color, backgroundColor: rgbToRgba(color, 0.12) }}
    >
      {label && (
        <span
          className="absolute -top-px left-0 -translate-y-full rounded-sm px-1 text-[10px] font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      )}
    </div>
  )
)

DemoBox.displayName = "DemoBox"

const TextPreview = memo(({ spatial }: { spatial: ControlTag[] }) => {
  const color = demoColor(spatial, 0)
  const color2 = demoColor(spatial, 1)
  const hasSpans = spatial.length > 0
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-sm leading-relaxed">
      {hasSpans ? (
        <p>
          <Span color={color} label={spatial[0]?.choices[0]?.value}>
            Acme Corp
          </Span>{" "}
          opened a new office in{" "}
          <Span color={color2} label={spatial[0]?.choices[1]?.value}>
            Paris
          </Span>
          , and Dr. Jane Smith will lead the research team starting next spring.
        </p>
      ) : (
        <p className="text-muted-foreground">{SAMPLE_TEXT}</p>
      )}
    </div>
  )
})

TextPreview.displayName = "TextPreview"

const Span = memo(
  ({
    color,
    label,
    children,
  }: {
    color: string
    label?: string
    children: React.ReactNode
  }) => (
    <span
      className="rounded px-1 py-0.5 font-medium"
      style={{ backgroundColor: rgbToRgba(color, 0.22), color }}
    >
      {children}
      {label && (
        <span
          className="ml-1 rounded px-1 text-[10px] text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      )}
    </span>
  )
)

Span.displayName = "Span"

const AudioPreview = memo(({ spatial }: { spatial: ControlTag[] }) => (
  <div className="space-y-2 rounded-lg border border-border bg-background p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <AudioLines className="size-4" />
      Sample clip
    </div>
    <div className="relative flex h-16 items-center gap-0.5 overflow-hidden rounded-md bg-muted px-2">
      {BARS.map((height, index) => (
        <div
          key={index}
          className="flex-1 rounded-full bg-muted-foreground/40"
          style={{ height: `${height}%` }}
        />
      ))}
      {spatial.length > 0 && (
        <div
          className="absolute inset-y-1 rounded-md border-2"
          style={{
            left: "18%",
            width: "30%",
            borderColor: demoColor(spatial, 0),
            backgroundColor: rgbToRgba(demoColor(spatial, 0), 0.15),
          }}
        />
      )}
    </div>
  </div>
))

AudioPreview.displayName = "AudioPreview"

// Static pseudo-waveform heights (no randomness — stable across renders).
const BARS = [
  30, 55, 40, 70, 50, 85, 60, 45, 75, 35, 65, 50, 80, 45, 55, 70, 40, 60, 50,
  75, 35, 55, 65, 45, 70, 50, 60, 40, 55, 45,
]

const Legend = memo(({ controls }: { controls: ControlTag[] }) => (
  <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
    {controls.map((control) => (
      <div key={control.name} className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {control.attrs.title || control.name}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {control.choices.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No labels yet — add some on the left.
            </span>
          ) : (
            control.choices.map((choice) => {
              const color = colorForChoice(control, choice.value)
              return (
                <span
                  key={choice.value}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"
                  )}
                  style={{
                    backgroundColor: rgbToRgba(color, 0.12),
                    borderColor: color,
                  }}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {choice.value}
                </span>
              )
            })
          )}
        </div>
      </div>
    ))}
  </div>
))

Legend.displayName = "Legend"
