import { memo, useMemo, useState } from "react"
import { Loader2, Pause, Play, X } from "lucide-react"
import { toAssetUrl } from "@/shared/lib/desktop"
import type { Item, Label } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import {
  audioLabelsValue,
  type StoredResult,
} from "@/shared/lib/label-config/result"
import {
  choicesToLabels,
  colorForChoice,
} from "@/shared/lib/label-config/config-helpers"
import {
  formatTime,
  type AudioSegment,
} from "@/features/studio/model/lib/audio-segments"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { useAudioBuffer } from "../audio/use-audio-buffer"
import { useAudioTransport } from "../audio/use-audio-transport"
import { Waveform } from "../audio/waveform"

interface ObjectAudioProps {
  doc: Item
  /** The Labels control bound to this audio, if any (enables range labeling). */
  control?: ControlTag
  regionResults: StoredResult[]
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

/** Ranges shorter than this are treated as a click (seek), not a selection. */
const MIN_SEGMENT_SECONDS = 0.05

// Audio viewer for the config engine: the same waveform + transport as the
// native audio editor. With a Labels control bound, dragging the waveform
// labels a time range (stored as a generic result); without one it is a player
// scored by the whole-item controls below.
export const ObjectAudio = memo(
  ({
    doc,
    control,
    regionResults,
    onCreateRegion,
    onDeleteRegion,
  }: ObjectAudioProps) => {
    const { data, error } = useAudioBuffer(doc.path, doc.id)
    const transport = useAudioTransport(doc.id)
    const [pending, setPending] = useState<{
      start: number
      end: number
      x: number
      y: number
    } | null>(null)
    const duration = data?.duration ?? 0

    const labels = useMemo(
      () => (control ? choicesToLabels(control) : []),
      [control]
    )
    const segments = useMemo<AudioSegment[]>(
      () =>
        regionResults
          .map((result) => {
            const value = result.value as {
              start: number
              end: number
              labels?: string[]
            }
            const label = value.labels?.[0] ?? control?.name ?? ""
            return {
              id: result.id,
              tStart: value.start,
              tEnd: value.end,
              label,
              color: control ? colorForChoice(control, label) : "#6366f1",
            }
          })
          .sort((a, b) => a.tStart - b.tStart),
      [regionResults, control]
    )

    const pickLabel = (label: Label) => {
      if (!pending || !control) return
      onCreateRegion(
        control,
        audioLabelsValue(pending.start, pending.end, [label.name]),
        label.color
      )
      setPending(null)
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-1.5">
          <button
            type="button"
            onClick={transport.togglePlay}
            disabled={!data}
            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            aria-label={transport.isPlaying ? "Pause" : "Play"}
          >
            {transport.isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
          <span className="font-mono text-xs text-muted-foreground">
            {formatTime(transport.currentTime)} / {formatTime(duration)}
          </span>
          {control && (
            <span className="ml-auto text-xs text-muted-foreground">
              Drag the waveform to label a range
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Decoding audio…
            </div>
          ) : (
            <div className="w-full">
              <Waveform
                peaks={data.peaks}
                duration={duration}
                segments={segments}
                currentTime={transport.currentTime}
                interactive={!!control}
                onSeek={transport.seek}
                onSelectRange={(start, end, x, y) => {
                  if (end - start >= MIN_SEGMENT_SECONDS)
                    setPending({ start, end, x, y })
                }}
              />
            </div>
          )}
        </div>

        {segments.length > 0 && (
          <ul className="flex max-h-32 shrink-0 flex-wrap gap-1.5 overflow-auto border-t border-border bg-card px-4 py-2">
            {segments.map((segment) => (
              <li
                key={segment.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-xs"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <button
                  type="button"
                  onClick={() => transport.seek(segment.tStart)}
                  className="font-semibold hover:underline"
                >
                  {segment.label}
                </button>
                <span className="font-mono text-muted-foreground">
                  {formatTime(segment.tStart)}–{formatTime(segment.tEnd)}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteRegion(segment.id)}
                  aria-label={`Remove ${segment.label} range`}
                  className="rounded-full hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
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

        <audio
          ref={transport.audioRef}
          src={toAssetUrl(doc.path)}
          onTimeUpdate={(event) =>
            transport.setCurrentTime(event.currentTarget.currentTime)
          }
          onEnded={() => transport.setIsPlaying(false)}
          className="hidden"
        />
      </div>
    )
  }
)

ObjectAudio.displayName = "ObjectAudio"
