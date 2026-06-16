// Video Annotation (Phase 5) — frontend mirror of the Rust
// `domain::video::model` types. Field names are camelCase to match the
// backend's `#[serde(rename_all = "camelCase")]`.
//
// All video *processing* (decode, frame extraction, scene detection) happens in
// the Rust backend via FFmpeg + CUDA. The webview only plays the clip and edits
// tracks; these types describe what crosses the IPC boundary.

export interface VideoPoint {
  x: number
  y: number
}

/** A detected scene boundary (first frame of a new shot). */
export interface SceneCut {
  frame: number
  time: number
  /** FFmpeg scene score [0,1]; 1.0 for the implicit opening cut. */
  score: number
}

/** A frame FFmpeg wrote to the on-disk cache (filmstrip / scrub thumbnails). */
export interface FrameThumb {
  /** Frame index in the source video (time × source fps). */
  frame: number
  time: number
  /** Absolute path; render via `toAssetUrl(path)`. */
  path: string
}

export type VideoStatus = "imported" | "processing" | "ready" | "failed"

export interface VideoMeta {
  id: string
  projectId: string
  name: string
  /** Absolute on-disk path to the source clip (play via `toAssetUrl`). */
  path: string
  fps: number
  /** Duration in seconds. */
  duration: number
  width: number
  height: number
  frameCount: number
  /** Rate the filmstrip frames were sampled at (frames per source second). */
  sampleFps: number
  framesDir: string
  frames: FrameThumb[]
  sceneCuts: SceneCut[]
  status: VideoStatus
  createdAt: string
  updatedAt: string
}

/** Shape kind for a track. */
export type TrackKind = "box" | "polygon"

export interface TrackKeyframe {
  frame: number
  /** Box: `[topLeft, bottomRight]`. Polygon: vertices. Image-space coords. */
  shape: VideoPoint[]
  /** Object not present on this frame (interpolation stops here). */
  outside: boolean
  /** Present but occluded (cosmetic; still interpolated). */
  occluded: boolean
}

export interface Track {
  id: string
  projectId: string
  videoId: string
  labelId?: string | null
  labelName: string
  color: string
  type: TrackKind
  keyframes: TrackKeyframe[]
  createdAt: string
  updatedAt: string
}

/** A track shape resolved at one frame (returned by track export). */
export interface MaterializedShape {
  trackId: string
  labelId?: string | null
  labelName: string
  color: string
  type: TrackKind
  frame: number
  shape: VideoPoint[]
  keyframe: boolean
  interpolated: boolean
}

/** Background ingest (extract + scene detect) progress. */
export interface VideoJob {
  jobId: string
  videoId: string
  projectId: string
  status: "queued" | "running" | "completed" | "failed"
  stage: string
  progress: number
  error: string | null
  startedAt: string
  updatedAt: string
}

/** Reported FFmpeg / CUDA availability. */
export interface FfmpegInfo {
  ffmpeg: boolean
  ffprobe: boolean
  cuda: boolean
  version: string | null
  message: string
}

export interface ImportVideoRequest {
  projectId: string
  name: string
  path: string
  /** Webview `<video>` fallbacks used only if ffprobe is unavailable. */
  fps?: number
  duration?: number
  width?: number
  height?: number
}

export interface IngestOptions {
  /** Filmstrip sampling rate (frames per source second). Default 2. */
  sampleFps?: number
  /** FFmpeg scene threshold [0,1]. Default 0.4. */
  sceneThreshold?: number
  /** Use CUDA hardware decode (auto software fallback). Default true. */
  useCuda?: boolean
}

/** A track shape sampled at a frame for live rendering (see track-engine). */
export interface SampledShape {
  shape: VideoPoint[]
  keyframe: boolean
}
