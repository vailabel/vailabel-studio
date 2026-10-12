import { rgbToRgba } from "./utils"

describe("rgbToRgba", () => {
  it("applies the opacity to rgb() colors", () => {
    expect(rgbToRgba("rgb(10, 20, 30)", 0.2)).toBe("rgba(10, 20, 30, 0.2)")
  })

  it("applies the opacity to hex colors, long and short", () => {
    expect(rgbToRgba("#ef4444", 0.12)).toBe("rgba(239, 68, 68, 0.12)")
    expect(rgbToRgba("#0f8", 0.5)).toBe("rgba(0, 255, 136, 0.5)")
  })

  it("replaces an existing alpha", () => {
    expect(rgbToRgba("rgba(10, 20, 30, 0.9)", 0.1)).toBe(
      "rgba(10, 20, 30, 0.1)"
    )
  })

  it("is transparent without a color and leaves unknown formats alone", () => {
    expect(rgbToRgba(undefined, 0.5)).toBe("rgba(0, 0, 0, 0)")
    expect(rgbToRgba("hsl(10 50% 50%)", 0.5)).toBe("hsl(10 50% 50%)")
  })
})
