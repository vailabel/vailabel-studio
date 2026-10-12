import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"
import type { Item, Label } from "@/shared/types/core"
import type { ControlTag, ObjectTag } from "@/shared/lib/label-config/types"
import {
  timeseriesValue,
  type StoredResult,
} from "@/shared/lib/label-config/result"
import {
  choicesToLabels,
  colorForChoice,
} from "@/shared/lib/label-config/config-helpers"
import { rgbToRgba } from "@/shared/lib/utils"
import {
  decimateIndices,
  formatTime,
  parseTimeSeries,
  type TimeSeriesChannel,
} from "@/features/studio/model/lib/timeseries"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"
import { Notice } from "./config-notice"

interface ObjectTimeSeriesProps {
  object: ObjectTag
  doc: Item
  /** The TimeSeriesLabels control bound to this object, if any. */
  control?: ControlTag
  regionResults: StoredResult[]
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

// Points drawn per channel. A 1000-unit-wide plot can't show more detail, and
// the min/max decimation keeps every spike visible.
const MAX_POINTS = 2000
const PLOT_WIDTH = 1000
const PLOT_HEIGHT = 100
const CHANNEL_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
]
const TICKS = [0, 0.25, 0.5, 0.75, 1]
/** Shortest drag (as a fraction of the axis) that counts as a range. */
const MIN_DRAG = 0.005

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function channelPath(
  time: number[],
  channel: TimeSeriesChannel,
  t0: number,
  span: number
) {
  const range = channel.max - channel.min || 1
  let path = ""
  let pen = "M"
  for (const index of decimateIndices(channel.values, MAX_POINTS)) {
    const value = channel.values[index]
    if (!Number.isFinite(value)) {
      pen = "M" // break the line across a gap
      continue
    }
    const x = ((time[index] - t0) / span) * PLOT_WIDTH
    const y =
      PLOT_HEIGHT - 4 - ((value - channel.min) / range) * (PLOT_HEIGHT - 8)
    path += `${pen}${x.toFixed(1)} ${y.toFixed(1)}`
    pen = "L"
  }
  return path
}

// Time-series viewer for the config engine: one stacked plot per channel on a
// shared time axis. With a TimeSeriesLabels control bound, dragging across the
// plots selects a time range to label; otherwise it is a read-only chart scored
// by the whole-item controls below.
export const ObjectTimeSeries = memo(
  ({
    object,
    doc,
    control,
    regionResults,
    onCreateRegion,
    onDeleteRegion,
  }: ObjectTimeSeriesProps) => {
    const plotRef = useRef<HTMLDivElement>(null)
    const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
    const [pending, setPending] = useState<{
      from: number
      to: number
      x: number
      y: number
    } | null>(null)

    const { text: source, error } = useDocumentText(
      doc.path,
      doc.id,
      inlineFieldText(doc, object.valueKey)
    )
    const { series, parseError } = useMemo(() => {
      if (source == null) return { series: null, parseError: null }
      try {
        return {
          series: parseTimeSeries(source, {
            timeColumn: object.attrs.timecolumn,
            separator: object.attrs.sep,
          }),
          parseError: null,
        }
      } catch {
        return {
          series: null,
          parseError: "This file isn't valid CSV or JSON.",
        }
      }
    }, [source, object.attrs.timecolumn, object.attrs.sep])

    const t0 = series?.time[0] ?? 0
    const t1 = series?.time[series.time.length - 1] ?? 1
    const span = t1 - t0 || 1

    const paths = useMemo(
      () =>
        series?.channels.map((channel) =>
          channelPath(series.time, channel, t0, span)
        ) ?? [],
      [series, t0, span]
    )
    const labels = useMemo(
      () => (control ? choicesToLabels(control) : []),
      [control]
    )
    const regions = useMemo(
      () =>
        regionResults.map((result) => {
          const value = result.value as {
            start: number
            end: number
            timeserieslabels?: string[]
          }
          const label = value.timeserieslabels?.[0] ?? control?.name ?? ""
          return {
            id: result.id,
            from: clamp01((value.start - t0) / span),
            to: clamp01((value.end - t0) / span),
            label,
            color: control ? colorForChoice(control, label) : "#6366f1",
          }
        }),
      [regionResults, control, t0, span]
    )

    const fractionAt = useCallback((clientX: number) => {
      const rect = plotRef.current!.getBoundingClientRect()
      return clamp01((clientX - rect.left) / rect.width)
    }, [])

    const onPointerDown = (event: React.PointerEvent) => {
      if (!control) return
      const at = fractionAt(event.clientX)
      setDrag({ from: at, to: at })
    }

    // Track the drag on the window so it survives leaving the plot.
    const dragging = drag !== null
    useEffect(() => {
      if (!dragging) return
      const onMove = (event: PointerEvent) =>
        setDrag((current) =>
          current ? { ...current, to: fractionAt(event.clientX) } : current
        )
      const onUp = (event: PointerEvent) => {
        const to = fractionAt(event.clientX)
        setDrag((current) => {
          if (current && Math.abs(to - current.from) >= MIN_DRAG) {
            setPending({
              from: Math.min(current.from, to),
              to: Math.max(current.from, to),
              x: event.clientX,
              y: event.clientY,
            })
          }
          return null
        })
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      return () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
    }, [dragging, fractionAt])

    const pickLabel = (label: Label) => {
      if (!pending || !control) return
      onCreateRegion(
        control,
        timeseriesValue(t0 + pending.from * span, t0 + pending.to * span, [
          label.name,
        ]),
        label.color
      )
      setPending(null)
    }

    if (error || parseError) {
      return (
        <p className="px-6 py-5 text-sm text-destructive">
          {error ?? parseError}
        </p>
      )
    }
    if (!series) {
      return (
        <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading series…
        </div>
      )
    }
    if (series.channels.length === 0) {
      return (
        <Notice icon="info" title="No numeric channels">
          This file has no numeric columns to plot.
        </Notice>
      )
    }

    const selection = drag ?? pending
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        <div
          ref={plotRef}
          onPointerDown={onPointerDown}
          className={
            control
              ? "relative cursor-crosshair touch-none select-none"
              : "relative select-none"
          }
        >
          {series.channels.map((channel, index) => (
            <div
              key={channel.name}
              className="border-b border-border last:border-b-0"
            >
              <div className="flex justify-between px-1 pt-1 text-[11px] text-muted-foreground">
                <span className="font-semibold">{channel.name}</span>
                <span className="tabular-nums">
                  {channel.min.toFixed(2)} – {channel.max.toFixed(2)}
                </span>
              </div>
              <svg
                viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
                preserveAspectRatio="none"
                className="block h-28 w-full"
                role="img"
                aria-label={`${channel.name} over time`}
              >
                <path
                  d={paths[index]}
                  fill="none"
                  stroke={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          ))}

          {/* Labeled ranges and the live selection span every channel. */}
          <div className="pointer-events-none absolute inset-0">
            {regions.map((region) => (
              <div
                key={region.id}
                className="absolute inset-y-0 border-x"
                style={{
                  left: `${region.from * 100}%`,
                  width: `${Math.max(0.2, (region.to - region.from) * 100)}%`,
                  backgroundColor: rgbToRgba(region.color, 0.18),
                  borderColor: region.color,
                }}
              >
                <span
                  className="pointer-events-auto absolute left-0 top-0 inline-flex items-center gap-0.5 rounded-br px-1 text-[10px] font-semibold uppercase leading-tight text-white"
                  style={{ backgroundColor: region.color }}
                >
                  {region.label}
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onDeleteRegion(region.id)}
                    aria-label={`Remove ${region.label} range`}
                    className="rounded-full hover:bg-black/20"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              </div>
            ))}
            {selection && (
              <div
                className="absolute inset-y-0 border-x border-primary bg-primary/15"
                style={{
                  left: `${Math.min(selection.from, selection.to) * 100}%`,
                  width: `${Math.abs(selection.to - selection.from) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          {TICKS.map((tick) => (
            <span key={tick}>
              {formatTime(
                t0 + tick * span,
                series.isDate,
                series.isDate ? span : 0
              )}
            </span>
          ))}
        </div>

        {control && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Drag across the chart to label a time range.
          </p>
        )}

        {pending && (
          <FloatingLabelMenu
            x={pending.x}
            y={pending.y}
            labels={labels}
            emptyHint="Add a label to this control."
            onPick={pickLabel}
            onDismiss={() => setPending(null)}
          />
        )}
      </div>
    )
  }
)

ObjectTimeSeries.displayName = "ObjectTimeSeries"
