import { formatSrtTime, toSrt } from "./srt-exporter"

const cue = (tStart: number, tEnd: number, label: string, text?: string) => ({
  tStart,
  tEnd,
  label,
  text,
})

describe("formatSrtTime", () => {
  it("formats HH:MM:SS,mmm", () => {
    expect(formatSrtTime(0)).toBe("00:00:00,000")
    expect(formatSrtTime(3723.456)).toBe("01:02:03,456")
    expect(formatSrtTime(59.9996)).toBe("00:01:00,000")
    expect(formatSrtTime(-1)).toBe("00:00:00,000")
  })
})

describe("toSrt", () => {
  it("numbers cues in time order and prefers the transcript over the label", () => {
    expect(
      toSrt([
        cue(2.5, 4, "speech", "second line"),
        cue(0, 1.25, "speech", "Hello there"),
        cue(5, 6, "music"),
      ])
    ).toBe(
      [
        "1",
        "00:00:00,000 --> 00:00:01,250",
        "Hello there",
        "",
        "2",
        "00:00:02,500 --> 00:00:04,000",
        "second line",
        "",
        "3",
        "00:00:05,000 --> 00:00:06,000",
        "music",
        "",
      ].join("\n")
    )
  })

  it("skips zero-length cues", () => {
    expect(toSrt([cue(1, 1, "x", "y")])).toBe("")
  })
})
