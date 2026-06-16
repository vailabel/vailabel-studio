import type { Annotation } from "@/shared/types/core"
import {
  annotationsToSegments,
  formatTime,
  normalizeRange,
  toAudioJsonl,
} from "./audio-segments"

describe("annotationsToSegments", () => {
  it("keeps valid audio-meta annotations, sorted by start", () => {
    const annotations = [
      { id: "b", name: "spk2", color: "#0f0", meta: { kind: "audio", tStart: 5, tEnd: 8 } },
      { id: "a", name: "spk1", color: "#f00", meta: { kind: "audio", tStart: 1, tEnd: 3, text: "hi" } },
      { id: "x", name: "bad", meta: { kind: "audio", tStart: 2, tEnd: 2 } }, // empty
      { id: "y", name: "box", meta: { kind: "spatial" } }, // not audio
    ] as unknown as Annotation[]
    const segments = annotationsToSegments(annotations)
    expect(segments.map((s) => s.id)).toEqual(["a", "b"])
    expect(segments[0]).toMatchObject({ tStart: 1, tEnd: 3, label: "spk1", text: "hi" })
  })
})

describe("formatTime", () => {
  it("formats minutes, seconds, and tenths", () => {
    expect(formatTime(0)).toBe("0:00.0")
    expect(formatTime(75.46)).toBe("1:15.4")
    expect(formatTime(-3)).toBe("0:00.0")
  })
})

describe("normalizeRange", () => {
  it("orders and clamps the range", () => {
    expect(normalizeRange(8, 2, 10)).toEqual({ tStart: 2, tEnd: 8 })
    expect(normalizeRange(-1, 99, 10)).toEqual({ tStart: 0, tEnd: 10 })
  })
  it("rejects ranges shorter than the minimum", () => {
    expect(normalizeRange(1, 1.01, 10)).toBeNull()
  })
})

describe("toAudioJsonl", () => {
  it("emits one clip per line", () => {
    const jsonl = toAudioJsonl([
      { audio: "a.wav", segments: [{ start: 0, end: 1, label: "speech", text: "hi" }] },
      { audio: "b.wav", segments: [] },
    ])
    const lines = jsonl.split("\n")
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0])).toEqual({
      audio: "a.wav",
      segments: [{ start: 0, end: 1, label: "speech", text: "hi" }],
    })
  })
})
