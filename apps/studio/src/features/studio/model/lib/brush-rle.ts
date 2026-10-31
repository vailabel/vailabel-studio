import { decodeBinary, encodeBinary } from "@thi.ng/rle-pack"

// Label Studio brush masks: the RGBA raster of the mask (alpha = coverage),
// run-length packed with @thi.ng/rle-pack and stored as a plain number array.
// Label Studio's converters read only the alpha channel, so every channel of a
// covered pixel carries the coverage value.

/** Pack a coverage mask (one byte per pixel, 0 = empty) into brush RLE. */
export function encodeMask(mask: Uint8Array): number[] {
  const rgba = new Uint8Array(mask.length * 4)
  for (let i = 0; i < mask.length; i++) {
    const a = mask[i]
    if (a) rgba.fill(a, i * 4, i * 4 + 4)
  }
  return Array.from(encodeBinary(rgba, rgba.length))
}

/** Unpack brush RLE into a coverage mask of `width * height` bytes. */
export function decodeMask(rle: number[], width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height)
  if (rle.length === 0) return mask
  const rgba = decodeBinary(Uint8Array.from(rle))
  const count = Math.min(mask.length, Math.floor(rgba.length / 4))
  for (let i = 0; i < count; i++) mask[i] = rgba[i * 4 + 3]
  return mask
}

/** Coverage mask from a canvas's alpha channel. */
export function maskFromImageData(data: ImageData): Uint8Array {
  const mask = new Uint8Array(data.width * data.height)
  for (let i = 0; i < mask.length; i++) mask[i] = data.data[i * 4 + 3]
  return mask
}
