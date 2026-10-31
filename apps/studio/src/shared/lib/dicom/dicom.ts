import { parseDicom, type DataSet } from "dicom-parser"

// DICOM reading for the medical modality: header scans (series grouping at
// import), pixel decoding with the modality LUT (rescale slope / intercept),
// and window / level → RGBA for display. Uncompressed transfer syntaxes only.

const PIXEL_DATA = "x7fe00010"

/** Transfer syntaxes whose pixel data is stored uncompressed. */
export const UNCOMPRESSED_TRANSFER_SYNTAXES = new Set([
  "1.2.840.10008.1.2", // implicit VR little endian
  "1.2.840.10008.1.2.1", // explicit VR little endian
  "1.2.840.10008.1.2.2", // explicit VR big endian (retired)
])

const BIG_ENDIAN = "1.2.840.10008.1.2.2"

/** What the import needs to know about one file, from its header alone. */
export interface DicomSliceInfo {
  path: string
  seriesUid: string
  sopUid: string
  instance: number
  /** Position along the slice normal (z of ImagePositionPatient), if any. */
  position?: number
  frames: number
  rows: number
  columns: number
  modality: string
  description: string
  transferSyntax: string
}

/** One slice of a series: a file, plus the frame within a multi-frame file. */
export interface DicomSliceRef {
  path: string
  frame: number
  sopUid: string
}

/** A series as stored on the item (`item.data.series`, JSON). */
export interface DicomSeries {
  uid: string
  description: string
  modality: string
  rows: number
  columns: number
  slices: DicomSliceRef[]
}

const tidy = (value: string | undefined) => (value ?? "").replace(/\0/g, "").trim()

/** Read a file's header (stops before the pixel data); null if not DICOM. */
export function readSliceInfo(path: string, bytes: Uint8Array): DicomSliceInfo | null {
  let dataSet: DataSet
  try {
    dataSet = parseDicom(bytes, { untilTag: PIXEL_DATA })
  } catch {
    return null
  }
  const seriesUid = tidy(dataSet.string("x0020000e"))
  const rows = dataSet.uint16("x00280010") ?? 0
  const columns = dataSet.uint16("x00280011") ?? 0
  if (!seriesUid || !rows || !columns) return null
  return {
    path,
    seriesUid,
    sopUid: tidy(dataSet.string("x00080018")),
    instance: dataSet.intString("x00200013") ?? 0,
    position: dataSet.floatString("x00200032", 2),
    frames: dataSet.intString("x00280008") ?? 1,
    rows,
    columns,
    modality: tidy(dataSet.string("x00080060")),
    description: tidy(dataSet.string("x0008103e")),
    transferSyntax: tidy(dataSet.string("x00020010")),
  }
}

/** Group scanned files into series, slices ordered along the patient axis
 *  (falling back to instance number); multi-frame files expand per frame. */
export function groupSeries(infos: DicomSliceInfo[]): DicomSeries[] {
  const bySeries = new Map<string, DicomSliceInfo[]>()
  for (const info of infos) {
    const list = bySeries.get(info.seriesUid) ?? []
    list.push(info)
    bySeries.set(info.seriesUid, list)
  }
  return [...bySeries.entries()].map(([uid, files]) => {
    const positioned = files.every((file) => file.position !== undefined)
    const ordered = [...files].sort((a, b) =>
      positioned ? a.position! - b.position! : a.instance - b.instance
    )
    const first = ordered[0]
    return {
      uid,
      description: first.description || first.modality || "Series",
      modality: first.modality,
      rows: first.rows,
      columns: first.columns,
      slices: ordered.flatMap((file) =>
        Array.from({ length: Math.max(1, file.frames) }, (_, frame) => ({
          path: file.path,
          frame,
          sopUid: file.sopUid,
        }))
      ),
    }
  })
}

/** A decoded slice: modality values (e.g. Hounsfield units) per pixel. */
export interface DicomPixels {
  width: number
  height: number
  data: Float32Array
  min: number
  max: number
  /** The file's default window, if it declares one. */
  window?: { center: number; width: number }
  /** MONOCHROME1: low values display bright. */
  invert: boolean
}

export class UnsupportedDicomError extends Error {}

/** Decode one frame of a DICOM file into modality values. */
export function decodeSlice(bytes: Uint8Array, frame = 0): DicomPixels {
  const dataSet = parseDicom(bytes)
  const syntax = tidy(dataSet.string("x00020010")) || "1.2.840.10008.1.2"
  if (!UNCOMPRESSED_TRANSFER_SYNTAXES.has(syntax)) {
    throw new UnsupportedDicomError(
      `Compressed DICOM (transfer syntax ${syntax}) isn't supported yet — export the series uncompressed.`
    )
  }
  const samples = dataSet.uint16("x00280002") ?? 1
  if (samples !== 1) throw new UnsupportedDicomError("Color DICOM images aren't supported yet.")
  const height = dataSet.uint16("x00280010") ?? 0
  const width = dataSet.uint16("x00280011") ?? 0
  const bits = dataSet.uint16("x00280100") ?? 16
  const signed = (dataSet.uint16("x00280103") ?? 0) === 1
  const slope = dataSet.floatString("x00281053") ?? 1
  const intercept = dataSet.floatString("x00281052") ?? 0
  const element = dataSet.elements[PIXEL_DATA]
  if (!element || !width || !height) throw new UnsupportedDicomError("This file has no image.")

  const count = width * height
  const bytesPerPixel = bits <= 8 ? 1 : 2
  const offset = element.dataOffset + frame * count * bytesPerPixel
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, count * bytesPerPixel)
  const little = syntax !== BIG_ENDIAN
  const data = new Float32Array(count)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < count; i++) {
    const raw =
      bytesPerPixel === 1
        ? signed
          ? view.getInt8(i)
          : view.getUint8(i)
        : signed
          ? view.getInt16(i * 2, little)
          : view.getUint16(i * 2, little)
    const value = raw * slope + intercept
    data[i] = value
    if (value < min) min = value
    if (value > max) max = value
  }
  const center = dataSet.floatString("x00281050")
  const windowWidth = dataSet.floatString("x00281051")
  return {
    width,
    height,
    data,
    min,
    max,
    window:
      center !== undefined && windowWidth !== undefined && windowWidth > 0
        ? { center, width: windowWidth }
        : undefined,
    invert: tidy(dataSet.string("x00280004")) === "MONOCHROME1",
  }
}

/** Common CT windows (center / width in HU). */
export const WINDOW_PRESETS = [
  { name: "Soft tissue", center: 40, width: 400 },
  { name: "Lung", center: -600, width: 1500 },
  { name: "Bone", center: 400, width: 1800 },
  { name: "Brain", center: 40, width: 80 },
] as const

/** The window to open a slice with: the file's own, or its full range. */
export function defaultWindow(pixels: DicomPixels) {
  return pixels.window ?? { center: (pixels.min + pixels.max) / 2, width: Math.max(1, pixels.max - pixels.min) }
}

/** Map modality values through a window to grayscale RGBA. */
export function applyWindow(
  pixels: DicomPixels,
  center: number,
  width: number
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(pixels.width * pixels.height * 4)
  const low = center - width / 2
  const scale = 255 / Math.max(1, width)
  for (let i = 0; i < pixels.data.length; i++) {
    let gray = (pixels.data[i] - low) * scale
    if (pixels.invert) gray = 255 - gray
    out[i * 4] = gray
    out[i * 4 + 1] = gray
    out[i * 4 + 2] = gray
    out[i * 4 + 3] = 255
  }
  return out
}
