import { memo } from "react"
import { AudioLines, Loader2, Pause, Play } from "lucide-react"
import { toAssetUrl } from "@/shared/lib/desktop"
import { formatTime } from "@/features/studio/model/lib/audio-segments"
import type { EditorProps } from "./types"
import { FloatingLabelMenu } from "./text/floating-label-menu"
import { useAudioBuffer } from "./audio/use-audio-buffer"
import { useAudioTransport } from "./audio/use-audio-transport"
import { useAudioSegments } from "./audio/use-audio-segments"
import { Waveform } from "./audio/waveform"
import { SegmentList } from "./audio/segment-list"

// Audio modality editor. One body for every audio task:
//   audio_classification / diarization → drag a region, pick a class/speaker
//   transcription → drag a region, then type its transcript in the list
export const AudioEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const doc = viewModel.data.item
  const { labels } = viewModel.data
  const { data, error } = useAudioBuffer(doc?.path, doc?.id)
  const withTranscript = capabilities.task === "transcription"
  const duration = data?.duration ?? 0

  const transport = useAudioTransport(doc?.id)
  const audio = useAudioSegments(viewModel, {
    docId: doc?.id,
    duration,
    withTranscript,
  })

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
              segments={audio.segments}
              currentTime={transport.currentTime}
              interactive
              onSeek={transport.seek}
              onSelectRange={audio.onSelectRange}
            />
          </div>
        )}
      </div>

      <SegmentList
        segments={audio.segments}
        withTranscript={withTranscript}
        onSeek={transport.seek}
        onDelete={viewModel.deleteAnnotation}
        onTranscript={audio.onTranscript}
      />

      {audio.pending && (
        <FloatingLabelMenu
          x={audio.pending.x}
          y={audio.pending.y}
          labels={labels}
          activeLabelId={viewModel.activeLabelId}
          emptyHint="Add a class to label regions."
          onPick={audio.confirmPending}
          onDismiss={audio.dismissPending}
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
})

AudioEditor.displayName = "AudioEditor"
