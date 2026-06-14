import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { isDesktopApp } from "@/lib/desktop"
import { services } from "@/services"
import type { Label } from "@/types/core"
import type {
  IngestOptions,
  Track,
  TrackKeyframe,
  VideoJob,
  VideoMeta,
  VideoPoint,
} from "@/types/video"
import {
  adjacentKeyframe,
  removeKeyframe as removeKeyframeAt,
  sampleTrackAt,
  upsertKeyframe,
} from "@/lib/video/track-engine"

const PROGRESS_EVENT = "video://progress"

/** A track resolved at the current frame, ready to render on the stage. */
export interface VisibleTrackShape {
  track: Track
  shape: VideoPoint[]
  isKeyframe: boolean
}

/**
 * Drives the Video Annotation editor: loads the video/tracks/labels, runs the
 * FFmpeg ingest job (with `video://progress`), and keeps the on-canvas
 * annotations synchronized with the timeline playhead by interpolating every
 * track at the current frame. Edits are written back as keyframes and persisted.
 */
export const useVideoAnnotationViewModel = (videoId: string) => {
  const video = services.getVideoService()
  const labelService = services.getLabelService()

  const [meta, setMeta] = useState<VideoMeta | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [job, setJob] = useState<VideoJob | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeJobRef = useRef<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const next = await video.get(videoId)
      setMeta(next)
      if (next) {
        const [trackList, labelList] = await Promise.all([
          video.listTracks(videoId),
          labelService.getLabelsByProjectId(next.projectId),
        ])
        setTracks(trackList)
        setLabels(labelList)
      }
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setIsLoading(false)
    }
  }, [video, labelService, videoId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ── Ingest job progress (extract frames + scene detection) ──────────────────

  const handleProgress = useCallback(
    (next: VideoJob) => {
      if (activeJobRef.current && next.jobId !== activeJobRef.current) return
      setJob(next)
      if (next.status === "completed") {
        activeJobRef.current = null
        setIsIngesting(false)
        void loadData()
      } else if (next.status === "failed") {
        activeJobRef.current = null
        setIsIngesting(false)
        setError(next.error || "Video processing failed")
      }
    },
    [loadData]
  )

  useEffect(() => {
    if (!isDesktopApp()) return
    let unlisten: (() => void) | undefined
    void listen<VideoJob>(PROGRESS_EVENT, ({ payload }) => {
      if (payload.videoId === videoId) handleProgress(payload)
    }).then((cleanup) => {
      unlisten = cleanup
    })
    return () => unlisten?.()
  }, [videoId, handleProgress])

  // Poll fallback so completion is detected even if an event is dropped.
  useEffect(() => {
    if (!isIngesting) return
    const interval = setInterval(async () => {
      const id = activeJobRef.current
      if (!id) return
      try {
        const status = await video.jobStatus(id)
        if (status) handleProgress(status)
      } catch {
        // transient; next tick retries
      }
    }, 1200)
    return () => clearInterval(interval)
  }, [video, isIngesting, handleProgress])

  const runIngest = useCallback(
    async (options?: IngestOptions) => {
      setError(null)
      setIsIngesting(true)
      try {
        const started = await video.ingest(videoId, options)
        activeJobRef.current = started.jobId
        setJob(started)
      } catch (nextError) {
        setIsIngesting(false)
        setError(errorMessage(nextError))
      }
    },
    [video, videoId]
  )

  // ── Track persistence ───────────────────────────────────────────────────────

  const persistTrack = useCallback(
    async (track: Track) => {
      try {
        const saved = await video.saveTrack(track)
        setTracks((prev) => {
          const exists = prev.some((t) => t.id === saved.id)
          return exists
            ? prev.map((t) => (t.id === saved.id ? saved : t))
            : [...prev, saved]
        })
        return saved
      } catch (nextError) {
        setError(errorMessage(nextError))
        return null
      }
    },
    [video]
  )

  /** Create a new track seeded with a first keyframe at the current frame. */
  const createTrack = useCallback(
    async (label: Label, shape: VideoPoint[], kind: "box" | "polygon" = "box") => {
      if (!meta) return null
      const draft: Partial<Track> = {
        projectId: meta.projectId,
        videoId: meta.id,
        labelId: label.id,
        labelName: label.name,
        color: label.color,
        type: kind,
        keyframes: [{ frame: currentFrame, shape, outside: false, occluded: false }],
      }
      const saved = await video.saveTrack(draft)
      setTracks((prev) => [...prev, saved])
      setSelectedTrackId(saved.id)
      return saved
    },
    [video, meta, currentFrame]
  )

  /** Insert/replace a keyframe at the current frame for a track. */
  const setKeyframe = useCallback(
    (trackId: string, shape: VideoPoint[], extra?: Partial<TrackKeyframe>) => {
      const track = tracks.find((t) => t.id === trackId)
      if (!track) return
      const keyframes = upsertKeyframe(track, currentFrame, { shape, ...extra })
      void persistTrack({ ...track, keyframes })
    },
    [tracks, currentFrame, persistTrack]
  )

  const deleteTrack = useCallback(
    async (trackId: string) => {
      try {
        await video.deleteTrack(trackId)
        setTracks((prev) => prev.filter((t) => t.id !== trackId))
        setSelectedTrackId((prev) => (prev === trackId ? null : prev))
      } catch (nextError) {
        setError(errorMessage(nextError))
      }
    },
    [video]
  )

  /** Remove the keyframe at `frame` (defaults to the current frame). */
  const removeKeyframe = useCallback(
    (trackId: string, frame = currentFrame) => {
      const track = tracks.find((t) => t.id === trackId)
      if (!track) return
      const keyframes = removeKeyframeAt(track, frame)
      if (keyframes.length === 0) {
        void deleteTrack(trackId)
        return
      }
      void persistTrack({ ...track, keyframes })
    },
    [tracks, currentFrame, persistTrack, deleteTrack]
  )

  /** Mark the object as leaving/entering the frame at the current position. */
  const toggleOutside = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId)
      if (!track) return
      const sampled = sampleTrackAt(track, currentFrame)
      const shape = sampled?.shape ?? track.keyframes[track.keyframes.length - 1]?.shape ?? []
      const existing = track.keyframes.find((kf) => kf.frame === currentFrame)
      const keyframes = upsertKeyframe(track, currentFrame, {
        shape,
        outside: !(existing?.outside ?? false),
      })
      void persistTrack({ ...track, keyframes })
    },
    [tracks, currentFrame, persistTrack]
  )

  // ── Playhead navigation ─────────────────────────────────────────────────────

  const lastFrame = Math.max(0, (meta?.frameCount ?? 1) - 1)

  const seekFrame = useCallback(
    (frame: number) => {
      setCurrentFrame(Math.max(0, Math.min(frame, lastFrame)))
    },
    [lastFrame]
  )

  const stepKeyframe = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedTrackId) return
      const track = tracks.find((t) => t.id === selectedTrackId)
      if (!track) return
      const target = adjacentKeyframe(track, currentFrame, direction)
      if (target !== null) seekFrame(target)
    },
    [selectedTrackId, tracks, currentFrame, seekFrame]
  )

  // ── Derived: shapes visible at the current frame ────────────────────────────

  const visibleShapes = useMemo<VisibleTrackShape[]>(() => {
    const out: VisibleTrackShape[] = []
    for (const track of tracks) {
      const sampled = sampleTrackAt(track, currentFrame)
      if (sampled) {
        out.push({ track, shape: sampled.shape, isKeyframe: sampled.keyframe })
      }
    }
    return out
  }, [tracks, currentFrame])

  const exportTracks = useCallback(async () => {
    try {
      const shapes = await video.exportTracks(videoId)
      downloadFile(
        `video-tracks-${videoId.slice(0, 8)}.json`,
        JSON.stringify({ video: meta, shapes }, null, 2),
        "application/json"
      )
    } catch (nextError) {
      setError(errorMessage(nextError))
    }
  }, [video, videoId, meta])

  return {
    meta,
    tracks,
    labels,
    currentFrame,
    lastFrame,
    selectedTrackId,
    visibleShapes,
    job,
    isIngesting,
    isLoading,
    error,
    loadData,
    runIngest,
    seekFrame,
    setSelectedTrackId,
    createTrack,
    setKeyframe,
    removeKeyframe,
    toggleOutside,
    deleteTrack,
    stepKeyframe,
    exportTracks,
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
