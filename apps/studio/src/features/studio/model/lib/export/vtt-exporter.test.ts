import { formatVttTime, toVtt } from "./vtt-exporter"

describe("formatVttTime", () => {
  it("formats HH:MM:SS.mmm", () => {
    expect(formatVttTime(0.5)).toBe("00:00:00.500")
    expect(formatVttTime(36000)).toBe("10:00:00.000")
  })
})

describe("toVtt", () => {
  it("writes the WEBVTT header and unnumbered cues", () => {
    expect(
      toVtt([
        { tStart: 0, tEnd: 1, label: "speech", text: "Hi" },
        { tStart: 1.5, tEnd: 2, label: "speech", text: "Bye" },
      ])
    ).toBe(
      [
        "WEBVTT",
        "",
        "00:00:00.000 --> 00:00:01.000",
        "Hi",
        "",
        "00:00:01.500 --> 00:00:02.000",
        "Bye",
        "",
      ].join("\n")
    )
  })

  it("emits just the header for a clip with no cues", () => {
    expect(toVtt([])).toBe("WEBVTT\n")
  })
})
