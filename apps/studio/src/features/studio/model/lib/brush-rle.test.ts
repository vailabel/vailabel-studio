import { decodeMask, encodeMask } from "./brush-rle"

describe("brush RLE", () => {
  it("round-trips a coverage mask", () => {
    const width = 16
    const height = 8
    const mask = new Uint8Array(width * height)
    for (let y = 2; y < 6; y++) mask.fill(255, y * width + 3, y * width + 11)
    const rle = encodeMask(mask)
    expect(rle.length).toBeLessThan(mask.length * 4)
    expect(decodeMask(rle, width, height)).toEqual(mask)
  })

  it("decodes an empty mask", () => {
    expect(decodeMask([], 4, 4)).toEqual(new Uint8Array(16))
  })
})
