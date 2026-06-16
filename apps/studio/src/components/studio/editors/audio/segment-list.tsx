import { memo, useEffect, useState } from "react"
import { Play, X } from "lucide-react"
import { formatTime, type AudioSegment } from "@/lib/audio-segments"

interface SegmentListProps {
  segments: AudioSegment[]
  /** Transcription task → show an editable transcript per segment. */
  withTranscript: boolean
  onSeek: (seconds: number) => void
  onDelete: (annotationId: string) => void
  onTranscript: (annotationId: string, text: string) => void
}

export const SegmentList = memo(
  ({ segments, withTranscript, onSeek, onDelete, onTranscript }: SegmentListProps) => (
    <div className="flex max-h-56 shrink-0 flex-col border-t border-border bg-card">
      <div className="border-b border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground">
        Segments ({segments.length})
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
        {segments.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Drag across the waveform to add a segment.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {segments.map((segment) => (
              <SegmentRow
                key={segment.id}
                segment={segment}
                withTranscript={withTranscript}
                onSeek={onSeek}
                onDelete={onDelete}
                onTranscript={onTranscript}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
)

SegmentList.displayName = "SegmentList"

const SegmentRow = memo(
  ({
    segment,
    withTranscript,
    onSeek,
    onDelete,
    onTranscript,
  }: {
    segment: AudioSegment
    withTranscript: boolean
    onSeek: (seconds: number) => void
    onDelete: (annotationId: string) => void
    onTranscript: (annotationId: string, text: string) => void
  }) => {
    const [draft, setDraft] = useState(segment.text ?? "")
    useEffect(() => setDraft(segment.text ?? ""), [segment.text])

    return (
      <li className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
        <button
          type="button"
          onClick={() => onSeek(segment.tStart)}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
          aria-label="Play from segment start"
        >
          <Play className="size-3.5" />
        </button>
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: segment.color }}
        />
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatTime(segment.tStart)}–{formatTime(segment.tEnd)}
        </span>
        <span className="shrink-0 text-xs font-semibold uppercase text-muted-foreground">
          {segment.label}
        </span>
        {withTranscript ? (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (draft !== (segment.text ?? "")) onTranscript(segment.id, draft)
            }}
            placeholder="Transcript…"
            className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm outline-none ring-border focus:ring-1"
          />
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={() => onDelete(segment.id)}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
          aria-label={`Remove ${segment.label}`}
        >
          <X className="size-3.5" />
        </button>
      </li>
    )
  }
)

SegmentRow.displayName = "SegmentRow"
