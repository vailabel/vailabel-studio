import { cueText, formatClock, subtitleCues, type SubtitleCue } from "./srt-exporter"

/** WebVTT timestamp: `HH:MM:SS.mmm`. */
export const formatVttTime = (seconds: number) => formatClock(seconds, ".")

/** One WebVTT (.vtt) file: `WEBVTT` header, then cues separated by blank lines. */
export function toVtt(cues: SubtitleCue[]): string {
  const body = subtitleCues(cues)
    .map(
      (cue) =>
        `${formatVttTime(cue.tStart)} --> ${formatVttTime(cue.tEnd)}\n${cueText(
          cue
        )}\n`
    )
    .join("\n")
  return body ? `WEBVTT\n\n${body}` : "WEBVTT\n"
}
