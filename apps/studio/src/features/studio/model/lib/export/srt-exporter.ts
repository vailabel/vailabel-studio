import type { AudioSegment } from "@/features/studio/model/lib/audio-segments"

export type SubtitleCue = Pick<AudioSegment, "tStart" | "tEnd" | "label" | "text">

/** `HH:MM:SS<separator>mmm`, rounded to the millisecond. */
export function formatClock(seconds: number, separator: "," | "."): string {
  const safe = Number.isFinite(seconds) ? seconds : 0
  const totalMs = Math.max(0, Math.round(safe * 1000))
  const totalSeconds = Math.floor(totalMs / 1000)
  const pad = (value: number, width = 2) => value.toString().padStart(width, "0")
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}${separator}${pad(
    totalMs % 1000,
    3
  )}`
}

/** SubRip timestamp: `HH:MM:SS,mmm`. */
export const formatSrtTime = (seconds: number) => formatClock(seconds, ",")

// The transcript is the cue text; a segment without one falls back to its label
// (e.g. a speaker or sound-event class).
export const cueText = (cue: SubtitleCue) => cue.text?.trim() || cue.label.trim()

/** Non-empty, positive-length cues in time order. */
export const subtitleCues = (cues: SubtitleCue[]) =>
  cues
    .filter((cue) => cue.tEnd > cue.tStart && cueText(cue))
    .sort((a, b) => a.tStart - b.tStart)

/** One SubRip (.srt) file: numbered cues separated by blank lines. */
export function toSrt(cues: SubtitleCue[]): string {
  return subtitleCues(cues)
    .map(
      (cue, index) =>
        `${index + 1}\n${formatSrtTime(cue.tStart)} --> ${formatSrtTime(
          cue.tEnd
        )}\n${cueText(cue)}\n`
    )
    .join("\n")
}
