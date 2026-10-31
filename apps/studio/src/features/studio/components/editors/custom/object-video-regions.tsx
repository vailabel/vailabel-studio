import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, EyeOff, Pause, Play, X } from "lucide-react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import type { Annotation, Item, Label } from "@/shared/types/core"
import type { ControlTag, ObjectTag } from "@/shared/lib/label-config/types"
import {
  resultsForControl,
  videoRectangleValue,
  type VideoKeyframe,
} from "@/shared/lib/label-config/result"
import { choicesToLabels, colorForChoice } from "@/shared/lib/label-config/config-helpers"
import {
  keyframeAt,
  rectAtFrame,
  upsertKeyframe,
  type PercentRect,
} from "@/features/studio/model/lib/video/video-regions"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { useMediaUrl } from "./media-source"
import { RegionToolbar } from "./region-toolbar"
import { useRegionTools } from "./region-tools"

interface ObjectVideoRegionsProps {
  object: ObjectTag
  doc: Item
  /** VideoRectangle controls bound to this video. */
  controls: ControlTag[]
  annotations: Annotation[]
  onCreateRegion: (control: ControlTag, value: Record<string, unknown>, color: string) => void
  onUpdateRegion: (annotationId: string, control: ControlTag, value: Record<string, unknown>) => void
  onDeleteRegion: (annotationId: string) => void
}

interface VideoTrack {
  id: string
  control: ControlTag
  label: string
  color: string
  sequence: VideoKeyframe[]
}

type Pt = [number, number]
const clamp = (n: number) => Math.max(0, Math.min(100, n))

/** Label Studio's default frame rate when the Video tag doesn't declare one. */
const DEFAULT_FPS = 24

// Video viewer for VideoRectangle: draw a box on a paused frame to start a
// track; with a track selected, drawing on another frame adds a keyframe.
// Boxes between keyframes are interpolated by the native track engine.
export const ObjectVideoRegions = memo(
  ({
    object,
    doc,
    controls,
    annotations,
    onCreateRegion,
    onUpdateRegion,
    onDeleteRegion,
  }: ObjectVideoRegionsProps) => {
    const fps = Number(object.attrs.framerate) || DEFAULT_FPS
    const src = useMediaUrl(doc, object.valueKey)
    const videoRef = useRef<HTMLVideoElement>(null)
    const surfaceRef = useRef<HTMLDivElement>(null)
    const tools = useRegionTools(controls)
    const [frame, setFrame] = useState(0)
    const [frameCount, setFrameCount] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [drag, setDrag] = useState<{ start: Pt; current: Pt } | null>(null)
    const [pending, setPending] = useState<{ rect: PercentRect; x: number; y: number } | null>(null)

    const tracks = useMemo<VideoTrack[]>(
      () =>
        controls.flatMap((control) =>
          resultsForControl(annotations, control.name).map((result) => {
            const value = result.value as { sequence?: VideoKeyframe[]; labels?: string[] }
            const label = value.labels?.[0] ?? control.name
            return {
              id: result.id,
              control,
              label,
              color: colorForChoice(control, label),
              sequence: value.sequence ?? [],
            }
          })
        ),
      [controls, annotations]
    )
    const selected = tracks.find((track) => track.id === selectedId)
    const labels = useMemo(() => (tools.active ? choicesToLabels(tools.active) : []), [tools.active])

    // Follow playback frame-accurately while playing.
    useEffect(() => {
      if (!playing) return
      let raf = 0
      const tick = () => {
        const video = videoRef.current
        if (video) setFrame(Math.round(video.currentTime * fps))
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }, [playing, fps])

    const seek = useCallback(
      (next: number) => {
        const target = Math.max(0, Math.min(Math.max(0, frameCount - 1), next))
        if (videoRef.current) videoRef.current.currentTime = target / fps
        setFrame(target)
      },
      [frameCount, fps]
    )

    const togglePlay = () => {
      const video = videoRef.current
      if (!video) return
      if (video.paused) void video.play()
      else video.pause()
    }

    const fracOf = useCallback((clientX: number, clientY: number): Pt => {
      const rect = surfaceRef.current!.getBoundingClientRect()
      return [
        clamp(((clientX - rect.left) / rect.width) * 100),
        clamp(((clientY - rect.top) / rect.height) * 100),
      ]
    }, [])

    const commitRect = useCallback(
      (rect: PercentRect, clientX: number, clientY: number) => {
        if (selected) {
          onUpdateRegion(
            selected.id,
            selected.control,
            videoRectangleValue(upsertKeyframe(selected.sequence, keyframeAt(frame, fps, rect)), [selected.label])
          )
        } else {
          setPending({ rect, x: clientX, y: clientY })
        }
      },
      [selected, frame, fps, onUpdateRegion]
    )

    useEffect(() => {
      if (!drag) return
      const onMove = (event: PointerEvent) =>
        setDrag((current) => (current ? { ...current, current: fracOf(event.clientX, event.clientY) } : current))
      const onUp = (event: PointerEvent) => {
        const end = fracOf(event.clientX, event.clientY)
        const rect = {
          x: Math.min(drag.start[0], end[0]),
          y: Math.min(drag.start[1], end[1]),
          width: Math.abs(end[0] - drag.start[0]),
          height: Math.abs(end[1] - drag.start[1]),
        }
        setDrag(null)
        if (rect.width >= 1 && rect.height >= 1) commitRect(rect, event.clientX, event.clientY)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      return () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
    }, [drag, fracOf, commitRect])

    const pickLabel = (label: Label) => {
      if (!pending || !tools.active) return
      onCreateRegion(
        tools.active,
        videoRectangleValue([keyframeAt(frame, fps, pending.rect)], [label.name]),
        label.color
      )
      setPending(null)
    }

    /** End the selected track on this frame (a disabled keyframe). */
    const hideFromHere = () => {
      if (!selected) return
      const box = rectAtFrame(selected.sequence, frame)
      if (!box) return
      onUpdateRegion(
        selected.id,
        selected.control,
        videoRectangleValue(upsertKeyframe(selected.sequence, keyframeAt(frame, fps, box, false)), [selected.label])
      )
    }

    const jumpKeyframe = (direction: -1 | 1) => {
      if (!selected) return
      const frames = selected.sequence.map((kf) => kf.frame)
      const next =
        direction > 0
          ? frames.find((f) => f > frame)
          : [...frames].reverse().find((f) => f < frame)
      if (next !== undefined) seek(next)
    }

    const preview = drag && {
      x: Math.min(drag.start[0], drag.current[0]),
      y: Math.min(drag.start[1], drag.current[1]),
      width: Math.abs(drag.current[0] - drag.start[0]),
      height: Math.abs(drag.current[1] - drag.start[1]),
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {controls.length > 1 && <RegionToolbar tools={tools} />}

        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/90 p-4">
          <div
            ref={surfaceRef}
            className={cn("relative select-none", !playing && "cursor-crosshair")}
            onPointerDown={(event) => {
              if (playing || event.button !== 0) return
              const point = fracOf(event.clientX, event.clientY)
              setDrag({ start: point, current: point })
            }}
          >
            <video
              ref={videoRef}
              src={src}
              className="block max-h-[60vh] max-w-full rounded"
              onLoadedMetadata={(event) =>
                setFrameCount(Math.max(1, Math.round(event.currentTarget.duration * fps)))
              }
              onPlay={() => setPlaying(true)}
              onPause={(event) => {
                setPlaying(false)
                setFrame(Math.round(event.currentTarget.currentTime * fps))
              }}
            />
            {tracks.map((track) => {
              const box = rectAtFrame(track.sequence, frame)
              if (!box) return null
              return (
                <button
                  key={track.id}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedId(track.id === selectedId ? null : track.id)}
                  className={cn(
                    "absolute border-2",
                    !box.keyframe && "border-dashed",
                    track.id === selectedId && "ring-2 ring-white"
                  )}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    borderColor: track.color,
                    backgroundColor: rgbToRgba(track.color, 0.12),
                  }}
                  aria-label={`Select ${track.label} track`}
                >
                  <span
                    className="absolute -top-4 left-0 rounded-t px-1 text-[10px] font-semibold uppercase leading-tight text-white"
                    style={{ backgroundColor: track.color }}
                  >
                    {track.label}
                  </span>
                </button>
              )
            })}
            {preview && (
              <span
                className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/15"
                style={{
                  left: `${preview.x}%`,
                  top: `${preview.y}%`,
                  width: `${preview.width}%`,
                  height: `${preview.height}%`,
                }}
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <button type="button" onClick={togglePlay} className="rounded p-1 hover:bg-muted" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button type="button" onClick={() => seek(frame - 1)} className="rounded p-1 hover:bg-muted" aria-label="Previous frame">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => seek(frame + 1)} className="rounded p-1 hover:bg-muted" aria-label="Next frame">
              <ChevronRight className="size-4" />
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, frameCount - 1)}
              value={frame}
              onChange={(event) => seek(Number(event.target.value))}
              className="min-w-0 flex-1"
              aria-label="Frame"
            />
            <span className="w-24 text-right tabular-nums text-muted-foreground">
              {frame + 1} / {frameCount || "–"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {tracks.length === 0 && (
              <span className="text-muted-foreground">Pause and drag on the video to start a track.</span>
            )}
            {tracks.map((track) => (
              <span
                key={track.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5",
                  track.id === selectedId ? "border-primary" : "border-border"
                )}
              >
                <button type="button" onClick={() => setSelectedId(track.id === selectedId ? null : track.id)} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: track.color }} />
                  <span className="font-semibold">{track.label}</span>
                  <span className="text-muted-foreground">{track.sequence.length} kf</span>
                </button>
                <button type="button" onClick={() => onDeleteRegion(track.id)} aria-label={`Remove ${track.label} track`} className="rounded-full hover:bg-muted">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {selected && (
              <span className="ml-auto inline-flex items-center gap-1">
                <span className="text-muted-foreground">Drag to add a keyframe ·</span>
                <button type="button" onClick={() => jumpKeyframe(-1)} className="rounded px-1.5 py-0.5 hover:bg-muted">
                  ◀ kf
                </button>
                <button type="button" onClick={() => jumpKeyframe(1)} className="rounded px-1.5 py-0.5 hover:bg-muted">
                  kf ▶
                </button>
                <button type="button" onClick={hideFromHere} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted">
                  <EyeOff className="size-3.5" />
                  Hide from here
                </button>
              </span>
            )}
          </div>
        </div>

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

ObjectVideoRegions.displayName = "ObjectVideoRegions"
