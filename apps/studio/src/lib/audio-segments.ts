// Pure helpers for the audio (speech) labeling editor — segment extraction,
// time formatting, and export. DOM/Web-Audio concerns live in the components.

import type { Annotation } from "@/types/core"

/** A labeled time range over an audio clip. */
export interface AudioSegment {
  id: string
  tStart: number
  tEnd: number
  label: string
  color: string
  /** Transcript text (ASR), when present. */
  text?: string
}

/** Pull the labeled audio segments out of a clip's annotations. */
export function annotationsToSegments(annotations: Annotation[]): AudioSegment[] {
  const segments: AudioSegment[] = []
  for (const annotation of annotations) {
    const meta = annotation.meta
    if (!meta || meta.kind !== "audio") continue
    if (
      typeof meta.tStart !== "number" ||
      typeof meta.tEnd !== "number" ||
      meta.tEnd <= meta.tStart
    ) {
      continue
    }
    segments.push({
      id: annotation.id,
      tStart: meta.tStart,
      tEnd: meta.tEnd,
      label: annotation.name,
      color: annotation.color || "#6366f1",
      text: meta.text,
    })
  }
  return segments.sort((a, b) => a.tStart - b.tStart)
}

/** Format seconds as m:ss.S (e.g. 75.4 → "1:15.4"). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  const whole = Math.floor(rest)
  const tenths = Math.floor((rest - whole) * 10)
  return `${minutes}:${whole.toString().padStart(2, "0")}.${tenths}`
}

/** Normalize a dragged range to ordered, clamped [start, end] seconds, or null
 *  if the range is too short to be a meaningful segment. */
export function normalizeRange(
  a: number,
  b: number,
  duration: number,
  minLength = 0.02
): { tStart: number; tEnd: number } | null {
  const tStart = Math.max(0, Math.min(a, b))
  const tEnd = Math.min(duration, Math.max(a, b))
  return tEnd - tStart >= minLength ? { tStart, tEnd } : null
}

// ── Export ──────────────────────────────────────────────────────────────────

export interface AudioExportClip {
  audio: string
  segments: Array<{
    start: number
    end: number
    label: string
    text?: string
  }>
}

/** Serialize audio clips + their segments to JSONL (one clip per line). */
export function toAudioJsonl(clips: AudioExportClip[]): string {
  return clips
    .map((clip) => JSON.stringify({ audio: clip.audio, segments: clip.segments }))
    .join("\n")
}
