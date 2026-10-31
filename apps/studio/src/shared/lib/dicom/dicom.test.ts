import { applyWindow, decodeSlice, groupSeries, readSliceInfo, type DicomSliceInfo } from "./dicom"
import { encodeDicom } from "./write-dicom"

function ctSlice(instance: number, z: number, pixels: number[]) {
  const values = new Int16Array(pixels)
  return encodeDicom("1.2.840.10008.5.1.4.1.1.2", `1.2.3.${instance}`, [
    { tag: "0008,0018", vr: "UI", value: `1.2.3.${instance}` },
    { tag: "0008,0060", vr: "CS", value: "CT" },
    { tag: "0008,103E", vr: "LO", value: "Chest" },
    { tag: "0020,000E", vr: "UI", value: "1.2.3.99" },
    { tag: "0020,0013", vr: "IS", value: String(instance) },
    { tag: "0020,0032", vr: "DS", value: `0\\0\\${z}` },
    { tag: "0028,0002", vr: "US", value: 1 },
    { tag: "0028,0004", vr: "CS", value: "MONOCHROME2" },
    { tag: "0028,0010", vr: "US", value: 2 },
    { tag: "0028,0011", vr: "US", value: 2 },
    { tag: "0028,0100", vr: "US", value: 16 },
    { tag: "0028,0101", vr: "US", value: 16 },
    { tag: "0028,0102", vr: "US", value: 15 },
    { tag: "0028,0103", vr: "US", value: 1 },
    { tag: "0028,1050", vr: "DS", value: "40" },
    { tag: "0028,1051", vr: "DS", value: "400" },
    { tag: "0028,1052", vr: "DS", value: "-1024" },
    { tag: "0028,1053", vr: "DS", value: "1" },
    { tag: "7FE0,0010", vr: "OW", value: new Uint8Array(values.buffer) },
  ])
}

describe("DICOM reading", () => {
  it("reads header info from a written file", () => {
    expect(readSliceInfo("a.dcm", ctSlice(3, 12.5, [0, 0, 0, 0]))).toMatchObject({
      seriesUid: "1.2.3.99",
      sopUid: "1.2.3.3",
      instance: 3,
      position: 12.5,
      rows: 2,
      columns: 2,
      modality: "CT",
      description: "Chest",
    })
  })

  it("rejects files that are not DICOM", () => {
    expect(readSliceInfo("notes.txt", new TextEncoder().encode("hello"))).toBeNull()
  })

  it("decodes pixels through the rescale and windows them", () => {
    const pixels = decodeSlice(ctSlice(1, 0, [1024, 1064, 0, 3000]))
    expect(Array.from(pixels.data)).toEqual([0, 40, -1024, 1976])
    expect(pixels.window).toEqual({ center: 40, width: 400 })
    const rgba = applyWindow(pixels, 40, 400)
    // (value - (center - width / 2)) * 255 / width, clamped.
    expect(rgba[0]).toBe(102)
    expect(Math.abs(rgba[4] - 127.5)).toBeLessThanOrEqual(0.5)
    expect([rgba[8], rgba[12], rgba[3]]).toEqual([0, 255, 255])
  })

  it("groups series and orders slices by position", () => {
    const info = (path: string, instance: number, position: number): DicomSliceInfo => ({
      path,
      seriesUid: "s",
      sopUid: path,
      instance,
      position,
      frames: 1,
      rows: 2,
      columns: 2,
      modality: "CT",
      description: "",
      transferSyntax: "1.2.840.10008.1.2.1",
    })
    const [series] = groupSeries([info("b", 1, 10), info("a", 2, -5)])
    expect(series.slices.map((slice) => slice.path)).toEqual(["a", "b"])
    expect(series.description).toBe("CT")
  })
})
