import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { toAssetUrl } from "@/lib/desktop"
import { Button } from "@/components/ui/button"
import { normalizeBox } from "@/lib/video/track-engine"
import type { VideoMeta, VideoPoint } from "@/types/video"
import type { VisibleTrackShape } from "@/viewmodels/video-annotation-viewmodel"

interface Fit {
  scale: number
  offsetX: number
  offsetY: number
}

/** Replicate CSS `object-contain`: largest scale that fits inside the box. */
const computeFit = (
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number
): Fit => {
  if (imgW <= 0 || imgH <= 0) return { scale: 1, offsetX: 0, offsetY: 0 }
  const scale = Math.min(boxW / imgW, boxH / imgH)
  return {
    scale,
    offsetX: (boxW - imgW * scale) / 2,
    offsetY: (boxH - imgH * scale) / 2,
  }
}

type Interaction =
  | { kind: "draw"; start: VideoPoint; current: VideoPoint }
  | {
      kind: "move"
      trackId: string
      origin: VideoPoint
      base: VideoPoint[]
      preview: VideoPoint[]
    }
  | { kind: "resize"; trackId: string; base: VideoPoint[]; preview: VideoPoint[] }

interface VideoStageProps {
  meta: VideoMeta
  currentFrame: number
  visibleShapes: VisibleTrackShape[]
  selectedTrackId: string | null
  /** When set, dragging on empty space draws a new box for this label color. */
  drawColor: string | null
  onFrameChange: (frame: number) => void
  onSelectTrack: (trackId: string) => void
  onCreateBox: (shape: VideoPoint[]) => void
  onCommitBox: (trackId: string, shape: VideoPoint[]) => void
}

export const VideoStage: React.FC<VideoStageProps> = ({
  meta,
  currentFrame,
  visibleShapes,
  selectedTrackId,
  drawColor,
  onFrameChange,
  onSelectTrack,
  onCreateBox,
  onCommitBox,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [interaction, setInteraction] = useState<Interaction | null>(null)

  const fps = meta.fps || 30
  const lastFrame = Math.max(0, meta.frameCount - 1)
  const src = useMemo(() => toAssetUrl(meta.path), [meta.path])

  // ── Track container size for coordinate mapping ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fit = useMemo(
    () => computeFit(size.width, size.height, meta.width, meta.height),
    [size, meta.width, meta.height]
  )

  const toScreen = useCallback(
    (p: VideoPoint) => ({
      x: fit.offsetX + p.x * fit.scale,
      y: fit.offsetY + p.y * fit.scale,
    }),
    [fit]
  )

  const toImage = useCallback(
    (clientX: number, clientY: number): VideoPoint => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      const x = (clientX - rect.left - fit.offsetX) / fit.scale
      const y = (clientY - rect.top - fit.offsetY) / fit.scale
      return {
        x: Math.max(0, Math.min(x, meta.width)),
        y: Math.max(0, Math.min(y, meta.height)),
      }
    },
    [fit, meta.width, meta.height]
  )

  // ── Playback ↔ playhead sync ────────────────────────────────────────────────
  // While playing, the video drives the frame. While paused, the timeline does.
  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying) return
    const target = currentFrame / fps
    if (Math.abs(video.currentTime - target) > 0.5 / fps) {
      video.currentTime = target
    }
  }, [currentFrame, fps, isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      if (video) {
        const frame = Math.round(video.currentTime * fps)
        onFrameChange(Math.min(frame, lastFrame))
        if (video.ended || video.paused) setIsPlaying(false)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, fps, lastFrame, onFrameChange])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      void video.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const stepFrame = useCallback(
    (delta: number) => {
      const video = videoRef.current
      if (isPlaying && video) {
        video.pause()
        setIsPlaying(false)
      }
      onFrameChange(Math.max(0, Math.min(currentFrame + delta, lastFrame)))
    },
    [isPlaying, currentFrame, lastFrame, onFrameChange]
  )

  // ── Pointer interactions (draw / move / resize boxes) ───────────────────────
  const HANDLE = 10

  const capture = (event: React.PointerEvent) =>
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId)

  const onPointerDownBox = (
    event: React.PointerEvent,
    vs: VisibleTrackShape
  ) => {
    event.stopPropagation()
    onSelectTrack(vs.track.id)
    const origin = toImage(event.clientX, event.clientY)
    const base = vs.shape.map((p) => ({ ...p }))
    setInteraction({ kind: "move", trackId: vs.track.id, origin, base, preview: base })
    capture(event)
  }

  const onPointerDownResize = (
    event: React.PointerEvent,
    vs: VisibleTrackShape
  ) => {
    event.stopPropagation()
    onSelectTrack(vs.track.id)
    const base = vs.shape.map((p) => ({ ...p }))
    setInteraction({ kind: "resize", trackId: vs.track.id, base, preview: base })
    capture(event)
  }

  const onPointerDownStage = (event: React.PointerEvent) => {
    if (!drawColor) return
    const start = toImage(event.clientX, event.clientY)
    setInteraction({ kind: "draw", start, current: start })
    capture(event)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!interaction) return
    const p = toImage(event.clientX, event.clientY)
    if (interaction.kind === "draw") {
      setInteraction({ ...interaction, current: p })
    } else if (interaction.kind === "move") {
      const dx = p.x - interaction.origin.x
      const dy = p.y - interaction.origin.y
      setInteraction({
        ...interaction,
        preview: interaction.base.map((q) => ({ x: q.x + dx, y: q.y + dy })),
      })
    } else {
      setInteraction({ ...interaction, preview: [interaction.base[0], p] })
    }
  }

  const onPointerUp = () => {
    if (!interaction) return
    if (interaction.kind === "draw") {
      const box = normalizeBox([interaction.start, interaction.current])
      if (box[1].x - box[0].x > 2 && box[1].y - box[0].y > 2) onCreateBox(box)
    } else {
      onCommitBox(interaction.trackId, normalizeBox(interaction.preview))
    }
    setInteraction(null)
  }

  const previewFor = (trackId: string): VideoPoint[] | null => {
    if (!interaction || interaction.kind === "draw") return null
    return interaction.trackId === trackId ? interaction.preview : null
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden select-none"
        style={{ aspectRatio: `${meta.width} / ${meta.height}`, maxHeight: "60vh" }}
        onPointerDown={onPointerDownStage}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={src}
          className="absolute inset-0 w-full h-full object-contain"
          muted
          playsInline
          preload="auto"
        />

        {/* Annotation overlay */}
        <svg
          className="absolute inset-0 w-full h-full"
          width={size.width}
          height={size.height}
        >
          {visibleShapes.map((vs) => {
            const shape = previewFor(vs.track.id) ?? vs.shape
            const tl = toScreen(shape[0])
            const br = toScreen(shape[1] ?? shape[0])
            const selected = vs.track.id === selectedTrackId
            const w = br.x - tl.x
            const h = br.y - tl.y
            return (
              <g key={vs.track.id}>
                <rect
                  x={tl.x}
                  y={tl.y}
                  width={w}
                  height={h}
                  fill={selected ? `${vs.track.color}22` : "transparent"}
                  stroke={vs.track.color}
                  strokeWidth={selected ? 2.5 : 1.5}
                  strokeDasharray={vs.isKeyframe ? undefined : "5 4"}
                  style={{ cursor: "move" }}
                  onPointerDown={(event) => onPointerDownBox(event, vs)}
                />
                <foreignObject
                  x={tl.x}
                  y={Math.max(0, tl.y - 18)}
                  width={Math.max(40, w)}
                  height={18}
                  style={{ pointerEvents: "none" }}
                >
                  <span
                    className="inline-block px-1 text-[10px] font-medium text-white rounded-sm truncate"
                    style={{ backgroundColor: vs.track.color }}
                  >
                    {vs.track.labelName}
                    {!vs.isKeyframe && " ·interp"}
                  </span>
                </foreignObject>
                {selected && (
                  <rect
                    x={br.x - HANDLE / 2}
                    y={br.y - HANDLE / 2}
                    width={HANDLE}
                    height={HANDLE}
                    fill="white"
                    stroke={vs.track.color}
                    strokeWidth={1.5}
                    style={{ cursor: "nwse-resize" }}
                    onPointerDown={(event) => onPointerDownResize(event, vs)}
                  />
                )}
              </g>
            )
          })}

          {/* New-box draw preview */}
          {interaction?.kind === "draw" &&
            (() => {
              const box = normalizeBox([interaction.start, interaction.current])
              const tl = toScreen(box[0])
              const br = toScreen(box[1])
              return (
                <rect
                  x={tl.x}
                  y={tl.y}
                  width={br.x - tl.x}
                  height={br.y - tl.y}
                  fill={`${drawColor}22`}
                  stroke={drawColor ?? "#fff"}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )
            })()}
        </svg>

        {drawColor && !interaction && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs pointer-events-none">
            Drag to draw a box
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => stepFrame(-1)}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="default" size="icon" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => stepFrame(1)}>
          <SkipForward className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums ml-2">
          {formatTime(currentFrame / fps)} / {formatTime(meta.duration)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          frame {currentFrame} / {lastFrame}
        </span>
      </div>
    </div>
  )
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return "0:00.0"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const tenths = Math.floor((seconds * 10) % 10)
  return `${m}:${s.toString().padStart(2, "0")}.${tenths}`
}

export default VideoStage
