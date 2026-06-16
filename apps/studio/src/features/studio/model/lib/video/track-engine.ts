/**
 * Track engine — the client half of the tracking architecture.
 *
 * Resolves a {@link Track}'s sparse keyframes into a concrete shape at any
 * frame by linear interpolation. This is a synchronous, allocation-light mirror
 * of the Rust `domain::video::interpolation` module so the timeline can scrub at
 * 60fps without an IPC round-trip per frame (the backend copy is used for batch
 * export / materialization).
 *
 * Semantics (identical to the backend):
 *  - Before the first keyframe → not visible (`null`).
 *  - On/after the last keyframe → hold the last shape (unless `outside`).
 *  - Between keyframes a→b → if `a.outside`, gone until `b`; else interpolate.
 *  - Interpolation needs equal point counts; otherwise hold `a`.
 */

import type {
  SampledShape,
  Track,
  TrackKeyframe,
  VideoPoint,
} from "@/shared/types/video"

const sortedKeyframes = (track: Track): TrackKeyframe[] =>
  [...track.keyframes].sort((a, b) => a.frame - b.frame)

const lerpPoint = (a: VideoPoint, b: VideoPoint, t: number): VideoPoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

const lerpShape = (
  a: VideoPoint[],
  b: VideoPoint[],
  t: number
): VideoPoint[] => {
  if (a.length === 0 || a.length !== b.length) return a.map((p) => ({ ...p }))
  return a.map((p, i) => lerpPoint(p, b[i], t))
}

/** Resolve a track's shape at `frame`, or `null` when not visible. */
export const sampleTrackAt = (
  track: Track,
  frame: number
): SampledShape | null => {
  const kfs = sortedKeyframes(track)
  if (kfs.length === 0) return null

  const first = kfs[0]
  if (frame < first.frame) return null

  const last = kfs[kfs.length - 1]
  if (frame >= last.frame) {
    if (last.outside) return null
    return { shape: cloneShape(last.shape), keyframe: frame === last.frame }
  }

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]
    const b = kfs[i + 1]
    if (frame < a.frame || frame >= b.frame) continue
    if (a.outside) return null
    if (frame === a.frame) return { shape: cloneShape(a.shape), keyframe: true }
    const span = b.frame - a.frame
    const t = span > 0 ? (frame - a.frame) / span : 0
    return { shape: lerpShape(a.shape, b.shape, t), keyframe: false }
  }

  return null
}

const cloneShape = (shape: VideoPoint[]): VideoPoint[] =>
  shape.map((p) => ({ ...p }))

/** True when a keyframe is stored exactly on `frame`. */
export const isKeyframe = (track: Track, frame: number): boolean =>
  track.keyframes.some((kf) => kf.frame === frame)

/** Frames that carry an explicit keyframe, ascending. */
export const keyframeFrames = (track: Track): number[] =>
  sortedKeyframes(track).map((kf) => kf.frame)

/** The nearest keyframe frame in `direction` from `frame`, or null. */
export const adjacentKeyframe = (
  track: Track,
  frame: number,
  direction: "prev" | "next"
): number | null => {
  const frames = keyframeFrames(track)
  if (direction === "next") {
    return frames.find((f) => f > frame) ?? null
  }
  const before = frames.filter((f) => f < frame)
  return before.length ? before[before.length - 1] : null
}

/**
 * Insert or replace a keyframe at `frame`, returning a new keyframe array
 * (immutably). `partial` defaults `outside`/`occluded` to false.
 */
export const upsertKeyframe = (
  track: Track,
  frame: number,
  partial: Partial<TrackKeyframe> & { shape: VideoPoint[] }
): TrackKeyframe[] => {
  const next: TrackKeyframe = {
    frame,
    shape: cloneShape(partial.shape),
    outside: partial.outside ?? false,
    occluded: partial.occluded ?? false,
  }
  const rest = track.keyframes.filter((kf) => kf.frame !== frame)
  return [...rest, next].sort((a, b) => a.frame - b.frame)
}

/** Remove the keyframe at `frame` (no-op if none), returning a new array. */
export const removeKeyframe = (track: Track, frame: number): TrackKeyframe[] =>
  track.keyframes.filter((kf) => kf.frame !== frame)

/**
 * Predict the shape at `frame` from the last two keyframes using a
 * constant-velocity model — the auto-track propagation. With a single keyframe
 * it holds position; with none it returns null. This is the honest,
 * dependency-free tracker: it extrapolates motion rather than re-detecting the
 * object (which would need pixel access / a model).
 */
export const predictShapeAt = (
  track: Track,
  frame: number
): VideoPoint[] | null => {
  const kfs = sortedKeyframes(track)
  if (kfs.length === 0) return null

  const last = kfs[kfs.length - 1]
  if (kfs.length === 1) return cloneShape(last.shape)

  const prev = kfs[kfs.length - 2]
  const span = last.frame - prev.frame
  if (span <= 0 || prev.shape.length !== last.shape.length) {
    return cloneShape(last.shape)
  }
  // Velocity per frame, applied past the last keyframe.
  const dt = frame - last.frame
  return last.shape.map((p, i) => ({
    x: p.x + ((p.x - prev.shape[i].x) / span) * dt,
    y: p.y + ((p.y - prev.shape[i].y) / span) * dt,
  }))
}

// ── Box geometry helpers (boxes are 2-point shapes: [topLeft, bottomRight]) ──

/** Normalize a 2-point box so point 0 is the top-left, point 1 bottom-right. */
export const normalizeBox = (shape: VideoPoint[]): VideoPoint[] => {
  if (shape.length < 2) return shape
  const [a, b] = shape
  return [
    { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
    { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
  ]
}

export interface BoxRect {
  x: number
  y: number
  width: number
  height: number
}

/** Convert a shape's bounding extent to an {x,y,width,height} rect. */
export const shapeToRect = (shape: VideoPoint[]): BoxRect => {
  if (shape.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = shape.map((p) => p.x)
  const ys = shape.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  }
}

/** Intersection-over-union of two boxes — used for track association. */
export const iou = (a: BoxRect, b: BoxRect): number => {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  if (inter === 0) return 0
  const union = a.width * a.height + b.width * b.height - inter
  return union > 0 ? inter / union : 0
}
