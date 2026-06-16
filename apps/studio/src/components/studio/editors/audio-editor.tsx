import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AudioLines, Loader2, Pause, Play } from "lucide-react"
import { toAssetUrl } from "@/lib/desktop"
import {
  annotationsToSegments,
  formatTime,
  normalizeRange,
} from "@/lib/audio-segments"
import type { Label } from "@/types/core"
import type { EditorProps } from "./types"
import { FloatingLabelMenu } from "./text/floating-label-menu"
import { useAudioBuffer } from "./audio/use-audio-buffer"
import { Waveform } from "./audio/waveform"
import { SegmentList } from "./audio/segment-list"

interface PendingRange {
  tStart: number
  tEnd: number
  x: number
  y: number
}

// Audio modality editor. One body for every audio task:
//   audio_classification / diarization → drag a region, pick a class/speaker
//   transcription → drag a region, then type its transcript in the list
export const AudioEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const doc = viewModel.data.image
  const { annotations, labels } = viewModel.data
  const { data, error } = useAudioBuffer(doc?.path, doc?.id)

  const task = capabilities.task
  const withTranscript = task === "transcription"

  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pending, setPending] = useState<PendingRange | null>(null)

  const segments = useMemo(
    () => annotationsToSegments(annotations),
    [annotations]
  )
  const duration = data?.duration ?? 0

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  const createSegment = useCallback(
    (label: Label | null, tStart: number, tEnd: number) => {
      void viewModel.createAnnotationFromDraft({
        name: label?.name ?? "segment",
        color: label?.color ?? "#64748b",
        type: "segment",
        coordinates: [],
        labelId: label?.id,
        meta: {
          kind: "audio",
          tStart,
          tEnd,
          ...(withTranscript ? { text: "" } : {}),
        },
      })
    },
    [viewModel, withTranscript]
  )

  const onSelectRange = useCallback(
    (a: number, b: number, x: number, y: number) => {
      const range = normalizeRange(a, b, duration)
      if (!range) return
      if (withTranscript) {
        createSegment(null, range.tStart, range.tEnd)
      } else {
        setPending({ ...range, x, y })
      }
    },
    [duration, withTranscript, createSegment]
  )

  const onTranscript = useCallback(
    (id: string, text: string) => {
      const annotation = annotations.find((entry) => entry.id === id)
      if (annotation?.meta?.kind !== "audio") return
      void viewModel.updateAnnotation(id, {
        meta: { ...annotation.meta, text },
      })
    },
    [annotations, viewModel]
  )

  // Reset transport when switching clips.
  useEffect(() => {
    setCurrentTime(0)
    setIsPlaying(false)
    setPending(null)
  }, [doc?.id])

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted">
        <p className="text-muted-foreground">No audio in this project</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-sm">
        <AudioLines className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium" title={doc.name}>
          {doc.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {withTranscript
            ? "Drag the waveform to add a region, then transcribe it"
            : "Drag the waveform to label a region"}
        </span>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-1.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!data}
          className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <span className="font-mono text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Waveform */}
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
              currentTime={currentTime}
              interactive
              onSeek={seek}
              onSelectRange={onSelectRange}
            />
          </div>
        )}
      </div>

      <SegmentList
        segments={segments}
        withTranscript={withTranscript}
        onSeek={seek}
        onDelete={viewModel.deleteAnnotation}
        onTranscript={onTranscript}
      />

      {pending && (
        <FloatingLabelMenu
          x={pending.x}
          y={pending.y}
          labels={labels}
          activeLabelId={viewModel.activeLabelId}
          emptyHint="Add a class to label regions."
          onPick={(label) => {
            createSegment(label, pending.tStart, pending.tEnd)
            setPending(null)
          }}
          onDismiss={() => setPending(null)}
        />
      )}

      <audio
        ref={audioRef}
        src={toAssetUrl(doc.path)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  )
})

AudioEditor.displayName = "AudioEditor"
