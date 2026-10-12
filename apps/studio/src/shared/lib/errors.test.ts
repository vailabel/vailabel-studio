import { toErrorMessage } from "./errors"

describe("toErrorMessage", () => {
  it("uses the message of an Error", () => {
    expect(toErrorMessage(new Error("disk full"))).toBe("disk full")
  })

  it("stringifies non-Error values (IPC rejections are plain strings)", () => {
    expect(toErrorMessage("permission denied")).toBe("permission denied")
  })

  it("prefers the fallback over a raw non-Error value", () => {
    expect(toErrorMessage({ code: 7 }, "Could not decode audio.")).toBe(
      "Could not decode audio."
    )
  })
})
