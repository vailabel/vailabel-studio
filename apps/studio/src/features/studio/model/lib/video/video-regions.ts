import type { VideoKeyframe } from "@/shared/lib/label-config/result"
import type { Track } from "@/shared/types/video"
import { sampleTrackAt } from "./track-engine"

// Label Studio VideoRectangle tracks (a `sequence` of % keyframes) resolved
// through the native track engine, so config-driven video boxes interpolate
// exactly like the video editor's tracks.

export interface PercentRect {
  x: number
  y: number
  width: number
  height: number
}

/** A sequence as an engine track: boxes are [topLeft, bottomRight] in %. */
function asTrack(sequence: VideoKeyframe[]): Track {
  return {
    keyframes: sequence.map((kf) => ({
      frame: kf.frame,
      shape: [
        { x: kf.x, y: kf.y },
        { x: kf.x + kf.width, y: kf.y + kf.height },
      ],
      outside: !kf.enabled,
      occluded: false,
    })),
  } as Track
}

/** The box at `frame` (interpolated between keyframes), or null if hidden. */
export function rectAtFrame(sequence: VideoKeyframe[], frame: number): (PercentRect & { keyframe: boolean }) | null {
  const sample = sampleTrackAt(asTrack(sequence), frame)
  if (!sample || sample.shape.length < 2) return null
  const [a, b] = sample.shape
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
    keyframe: sample.keyframe,
  }
}

/** Insert or replace the keyframe at `kf.frame`, keeping frame order. */
export function upsertKeyframe(sequence: VideoKeyframe[], kf: VideoKeyframe): VideoKeyframe[] {
  return [...sequence.filter((entry) => entry.frame !== kf.frame), kf].sort(
    (a, b) => a.frame - b.frame
  )
}

/** A keyframe for `rect` at `frame` of a video playing at `fps`. */
export function keyframeAt(frame: number, fps: number, rect: PercentRect, enabled = true): VideoKeyframe {
  return { frame, enabled, rotation: 0, time: frame / fps, ...rect }
}
