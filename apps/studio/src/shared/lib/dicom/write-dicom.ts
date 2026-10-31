// A minimal DICOM Part 10 writer (explicit VR little endian) — enough to
// produce valid single-frame grayscale images for sample data and tests.

export interface DicomField {
  /** "GGGG,EEEE" in hex. */
  tag: string
  vr: string
  /** Strings for text VRs (multi-values joined by "\\"), numbers for US/UL,
   *  bytes for OB/OW. */
  value: string | number | Uint8Array
}

const LONG_VRS = new Set(["OB", "OW", "OF", "SQ", "UT", "UN"])

function bytesOf(field: DicomField): Uint8Array {
  if (field.value instanceof Uint8Array) return field.value
  if (field.vr === "US") return new Uint8Array(new Uint16Array([field.value as number]).buffer)
  if (field.vr === "UL") return new Uint8Array(new Uint32Array([field.value as number]).buffer)
  const text = String(field.value)
  // Even length: UIDs pad with NUL, other strings with a space.
  const padded = text.length % 2 ? text + (field.vr === "UI" ? "\0" : " ") : text
  return new TextEncoder().encode(padded)
}

function encodeElement(field: DicomField): Uint8Array {
  const [group, element] = field.tag.split(",").map((part) => parseInt(part, 16))
  let value = bytesOf(field)
  if (value.length % 2) value = Uint8Array.from([...value, 0])
  const long = LONG_VRS.has(field.vr)
  const header = new DataView(new ArrayBuffer(long ? 12 : 8))
  header.setUint16(0, group, true)
  header.setUint16(2, element, true)
  header.setUint8(4, field.vr.charCodeAt(0))
  header.setUint8(5, field.vr.charCodeAt(1))
  if (long) header.setUint32(8, value.length, true)
  else header.setUint16(6, value.length, true)
  const out = new Uint8Array(header.byteLength + value.length)
  out.set(new Uint8Array(header.buffer), 0)
  out.set(value, header.byteLength)
  return out
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** Encode a DICOM file: preamble, "DICM", file meta (group 0002) and the
 *  dataset `fields` (sorted by tag here, as the standard requires). */
export function encodeDicom(
  sopClassUid: string,
  sopInstanceUid: string,
  fields: DicomField[]
): Uint8Array {
  const meta = concat(
    [
      { tag: "0002,0001", vr: "OB", value: Uint8Array.from([0, 1]) },
      { tag: "0002,0002", vr: "UI", value: sopClassUid },
      { tag: "0002,0003", vr: "UI", value: sopInstanceUid },
      { tag: "0002,0010", vr: "UI", value: "1.2.840.10008.1.2.1" },
      { tag: "0002,0012", vr: "UI", value: "1.2.826.0.1.3680043.10.1" },
    ].map(encodeElement)
  )
  const groupLength = encodeElement({ tag: "0002,0000", vr: "UL", value: meta.length })
  const body = concat(
    [...fields].sort((a, b) => a.tag.localeCompare(b.tag)).map(encodeElement)
  )
  const preamble = new Uint8Array(132)
  preamble.set(new TextEncoder().encode("DICM"), 128)
  return concat([preamble, groupLength, meta, body])
}
