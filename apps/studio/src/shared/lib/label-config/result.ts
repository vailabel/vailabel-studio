import type { Annotation } from "@/shared/types/core"

// The generic result envelope (Label Studio shape) that every config-driven
// control produces, stored in `annotation.meta` as kind "result".

export interface StoredResult {
  id: string
  fromName: string
  toName: string
  resultType: string
  value: Record<string, unknown>
}

/** Pull the config-driven results out of an item's annotations. */
export function resultsFromAnnotations(annotations: Annotation[]): StoredResult[] {
  const results: StoredResult[] = []
  for (const annotation of annotations) {
    const meta = annotation.meta
    if (meta?.kind !== "result") continue
    results.push({
      id: annotation.id,
      fromName: meta.fromName,
      toName: meta.toName,
      resultType: meta.resultType,
      value: meta.value,
    })
  }
  return results
}

/** Results for a single control (by its `name`). */
export function resultsForControl(
  annotations: Annotation[],
  controlName: string
): StoredResult[] {
  return resultsFromAnnotations(annotations).filter(
    (result) => result.fromName === controlName
  )
}

/** Build the export-ready Label Studio `result` array for one item. Relations
 *  use Label Studio's top-level {type:"relation", from_id, to_id} shape; every
 *  other control uses the {from_name, to_name, type, value} envelope. */
export function toLabelStudioResults(
  annotations: Annotation[]
): Array<Record<string, unknown>> {
  return resultsFromAnnotations(annotations).map((result) => {
    if (result.resultType === "relation") {
      const value = result.value as {
        from_id?: string
        to_id?: string
        labels?: string[]
      }
      return {
        type: "relation",
        from_id: value.from_id ?? "",
        to_id: value.to_id ?? "",
        labels: value.labels ?? [],
      }
    }
    // Brush masks keep the source raster size inside `value`; Label Studio
    // carries it on the envelope as original_width / original_height.
    const { original_width, original_height, ...value } = result.value
    return {
      id: result.id,
      from_name: result.fromName,
      to_name: result.toName,
      type: result.resultType,
      ...(original_width !== undefined && { original_width, original_height }),
      value,
    }
  })
}

/** Label Studio's unlabeled shape controls (<Rectangle>, <Polygon>, …) mapped
 *  to the labeled twin whose geometry they share. */
export const UNLABELED_SHAPE_TWIN: Record<string, string> = {
  rectangle: "rectanglelabels",
  polygon: "polygonlabels",
  keypoint: "keypointlabels",
  ellipse: "ellipselabels",
  brush: "brushlabels",
}

/** The labeled shape family a region control draws (its own tag if labeled). */
export const shapeTagOf = (controlTag: string) =>
  UNLABELED_SHAPE_TWIN[controlTag] ?? controlTag

/** A region `value` built by a labeled builder, adapted to `controlTag`: as-is
 *  for labeled controls, and without the label key for an unlabeled shape. */
export function valueForControl(
  controlTag: string,
  value: Record<string, unknown>
): Record<string, unknown> {
  const twin = UNLABELED_SHAPE_TWIN[controlTag]
  if (!twin) return value
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== twin))
}

// ── value builders (the type-specific `value` payloads) ──────────────────────
export const choicesValue = (choices: string[]) => ({ choices })
export const taxonomyValue = (paths: string[]) => ({
  taxonomy: paths.map((path) => [path]),
})
export const textareaValue = (text: string[]) => ({ text })
export const ratingValue = (rating: number) => ({ rating })
export const numberValue = (number: number) => ({ number })
export const labelsValue = (
  start: number,
  end: number,
  text: string,
  labels: string[]
) => ({ start, end, text, labels })
export const rectangleValue = (
  x: number,
  y: number,
  width: number,
  height: number,
  labels: string[],
  rotation = 0
) => ({ x, y, width, height, rotation, rectanglelabels: labels })
export const polygonValue = (
  points: Array<[number, number]>,
  labels: string[]
) => ({ points, polygonlabels: labels })
export const keypointValue = (
  x: number,
  y: number,
  labels: string[],
  width = 0.6
) => ({ x, y, width, keypointlabels: labels })
export const relationValue = (
  fromId: string,
  toId: string,
  labels: string[] = []
) => ({ from_id: fromId, to_id: toId, labels })
/** Ellipse region: center + radii, all in % of the image box. */
export const ellipseValue = (
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  labels: string[],
  rotation = 0
) => ({ x, y, radiusX, radiusY, rotation, ellipselabels: labels })
/** Time-series range, in the series' own time units. */
export const timeseriesValue = (
  start: number,
  end: number,
  labels: string[]
) => ({ start, end, instant: start === end, timeserieslabels: labels })
/** HTML span, addressed by offsets into the document's rendered text. */
export const hypertextValue = (
  start: number,
  end: number,
  text: string,
  labels: string[]
) => ({ start, end, text, hypertextlabels: labels })
/** Audio range in seconds. */
export const audioLabelsValue = (
  start: number,
  end: number,
  labels: string[]
) => ({ start, end, labels })
/** Ranked order of the bound objects, best first. */
export const rankerValue = (ranked: string[]) => ({ ranker: ranked })
export const datetimeValue = (datetime: string) => ({ datetime })
/** Span inside one utterance of a Paragraphs (dialogue) object. `start`/`end`
 *  are paragraph indexes; the offsets are into those paragraphs' text. */
export const paragraphLabelsValue = (
  start: number,
  startOffset: number,
  end: number,
  endOffset: number,
  text: string,
  labels: string[]
) => ({
  start: String(start),
  end: String(end),
  startOffset,
  endOffset,
  text,
  paragraphlabels: labels,
})
/** Raster mask in Label Studio's brush RLE, with the raster size it encodes. */
export const brushValue = (
  rle: number[],
  width: number,
  height: number,
  labels: string[]
) => ({
  format: "rle",
  rle,
  brushlabels: labels,
  original_width: width,
  original_height: height,
})
/** One keyframe of a video rectangle track, in % of the frame. */
export interface VideoKeyframe {
  frame: number
  enabled: boolean
  x: number
  y: number
  width: number
  height: number
  rotation: number
  time: number
}
/** Rectangle tracked across video frames (Label Studio's VideoRectangle). */
export const videoRectangleValue = (
  sequence: VideoKeyframe[],
  labels: string[]
) => ({ sequence, labels })
/** 3D box in the point cloud's frame: center, size (length along the heading,
 *  width to its left, height up) and yaw in radians. */
export const cuboidValue = (
  box: {
    x: number
    y: number
    z: number
    length: number
    width: number
    height: number
    yaw: number
  },
  labels: string[]
) => ({ ...box, cuboidlabels: labels })
