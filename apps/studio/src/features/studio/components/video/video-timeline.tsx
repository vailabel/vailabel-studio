import * as React from "react"
import { useCallback, useRef } from "react"
import { Scissors } from "lucide-react"
import { toAssetUrl } from "@/shared/lib/desktop"
import { cn } from "@/shared/lib/utils"
import { keyframeFrames } from "@/features/studio/model/lib/video/track-engine"
import type { Track, VideoMeta } from "@/shared/types/video"

interface VideoTimelineProps {
  meta: VideoMeta
  tracks: Track[]
  currentFrame: number
  selectedTrackId: string | null
  onSeek: (frame: number) => void
  onSelectTrack: (trackId: string) => void
}

/**
 * Timeline UI: a scrubbable filmstrip + ruler with scene-cut markers, a draggable
 * playhead, and one lane per track showing keyframe diamonds and the
 * interpolated span. Frame→position is a simple proportional map so the whole
 * thing is responsive without measuring pixels.
 */
export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  meta,
  tracks,
  currentFrame,
  selectedTrackId,
  onSeek,
  onSelectTrack,
}) => {
  const lastFrame = Math.max(1, meta.frameCount - 1)
  const scrubRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const pct = (frame: number) => `${(frame / lastFrame) * 100}%`

  const frameFromClientX = useCallback(
    (clientX: number): number => {
      const rect = scrubRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return 0
      const ratio = (clientX - rect.left) / rect.width
      return Math.round(Math.max(0, Math.min(1, ratio)) * lastFrame)
    },
    [lastFrame]
  )

  const onScrubPointerDown = (event: React.PointerEvent) => {
    draggingRef.current = true
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
    onSeek(frameFromClientX(event.clientX))
  }
  const onScrubPointerMove = (event: React.PointerEvent) => {
    if (!draggingRef.current) return
    onSeek(frameFromClientX(event.clientX))
  }
  const onScrubPointerUp = () => {
    draggingRef.current = false
  }

  const ticks = buildTicks(meta)

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Ruler */}
      <div className="relative h-5">
        {ticks.map((tick) => (
          <div
            key={tick.frame}
            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
            style={{ left: pct(tick.frame) }}
          >
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {tick.label}
            </span>
          </div>
        ))}
      </div>

      {/* Scrubbable filmstrip + scene markers + playhead */}
      <div
        ref={scrubRef}
        className="relative h-14 rounded-md overflow-hidden bg-muted cursor-pointer"
        onPointerDown={onScrubPointerDown}
        onPointerMove={onScrubPointerMove}
        onPointerUp={onScrubPointerUp}
      >
        {meta.frames.length > 0 ? (
          <div className="absolute inset-0 flex">
            {meta.frames.map((frame) => (
              <img
                key={frame.frame}
                src={toAssetUrl(frame.path)}
                alt=""
                draggable={false}
                className="h-full flex-1 min-w-0 object-cover pointer-events-none"
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No extracted frames — run “Process video”.
          </div>
        )}

        {/* Scene-cut markers */}
        {meta.sceneCuts.map((cut) => (
          <div
            key={cut.frame}
            className="absolute top-0 bottom-0 w-px bg-warning/80"
            style={{ left: pct(cut.frame) }}
            title={`Scene cut @ ${cut.time.toFixed(2)}s`}
          >
            <Scissors className="h-3 w-3 text-warning -translate-x-1/2 absolute -top-0.5" />
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
          style={{ left: pct(currentFrame) }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-primary" />
        </div>
      </div>

      {/* Track lanes */}
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {tracks.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">
            No tracks yet. Pick a label and draw a box on the video to start one.
          </p>
        ) : (
          tracks.map((track) => (
            <TrackLane
              key={track.id}
              track={track}
              lastFrame={lastFrame}
              currentFrame={currentFrame}
              selected={track.id === selectedTrackId}
              onSelect={() => onSelectTrack(track.id)}
              onSeek={onSeek}
            />
          ))
        )}
      </div>
    </div>
  )
}

const TrackLane: React.FC<{
  track: Track
  lastFrame: number
  currentFrame: number
  selected: boolean
  onSelect: () => void
  onSeek: (frame: number) => void
}> = ({ track, lastFrame, currentFrame, selected, onSelect, onSeek }) => {
  const frames = keyframeFrames(track)
  const first = frames[0] ?? 0
  const last = frames[frames.length - 1] ?? 0
  const pct = (frame: number) => `${(frame / Math.max(1, lastFrame)) * 100}%`

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer",
        selected ? "bg-primary/10" : "hover:bg-muted/60"
      )}
      onClick={onSelect}
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: track.color }}
      />
      <span className="text-xs w-24 shrink-0 truncate text-foreground">
        {track.labelName}
      </span>
      <div className="relative flex-1 h-5">
        {/* interpolated span */}
        {frames.length > 1 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
            style={{
              left: pct(first),
              width: `${((last - first) / Math.max(1, lastFrame)) * 100}%`,
              backgroundColor: `${track.color}66`,
            }}
          />
        )}
        {/* keyframe diamonds */}
        {track.keyframes.map((kf) => (
          <button
            key={kf.frame}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rotate-45 border"
            style={{
              left: pct(kf.frame),
              backgroundColor: kf.outside ? "transparent" : track.color,
              borderColor: track.color,
            }}
            title={`Keyframe @ frame ${kf.frame}${kf.outside ? " (outside)" : ""}`}
            onClick={(event) => {
              event.stopPropagation()
              onSeek(kf.frame)
            }}
          />
        ))}
        {/* playhead tick within the lane */}
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/60 pointer-events-none"
          style={{ left: pct(currentFrame) }}
        />
      </div>
    </div>
  )
}

interface Tick {
  frame: number
  label: string
}

/** Build ~6 evenly spaced ruler ticks with mm:ss labels. */
const buildTicks = (meta: VideoMeta): Tick[] => {
  const lastFrame = Math.max(1, meta.frameCount - 1)
  const fps = meta.fps || 30
  const count = 6
  const ticks: Tick[] = []
  for (let i = 0; i <= count; i++) {
    const frame = Math.round((lastFrame * i) / count)
    const seconds = frame / fps
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    ticks.push({ frame, label: `${m}:${s.toString().padStart(2, "0")}` })
  }
  return ticks
}

export default VideoTimeline
