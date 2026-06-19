import type { Annotation, Item } from "@/shared/types/core"

/**
 * LabelMe (wkentaro/labelme) JSON sidecar format. One file per image, written
 * next to the image as `<image>.json`. `imageData` is always null — the image
 * is referenced by path, never embedded as base64.
 */
export interface LabelMeShape {
  label: string
  points: Array<[number, number]>
  group_id: number | null
  description?: string
  shape_type: string
  flags: Record<string, boolean>
}

export interface LabelMeFile {
  version: string
  flags: Record<string, boolean>
  shapes: LabelMeShape[]
  imagePath: string
  imageData: null
  imageHeight: number
  imageWidth: number
}

export const LABELME_VERSION = "5.5.0"

// Our annotation `type` -> LabelMe `shape_type`.
const TYPE_TO_SHAPE: Record<string, string> = {
  box: "rectangle",
  polygon: "polygon",
  point: "point",
  line: "line",
  linestrip: "linestrip",
  circle: "circle",
  freeDraw: "linestrip",
}

// LabelMe `shape_type` -> our annotation `type`.
const SHAPE_TO_TYPE: Record<string, string> = {
  rectangle: "box",
  polygon: "polygon",
  point: "point",
  line: "line",
  linestrip: "linestrip",
  points: "linestrip",
  circle: "circle",
}

function toShape(annotation: Annotation): LabelMeShape {
  return {
    label: annotation.name,
    points: annotation.coordinates.map((p) => [p.x, p.y] as [number, number]),
    group_id: annotation.groupId ?? annotation.group_id ?? null,
    description: "",
    shape_type: TYPE_TO_SHAPE[annotation.type] || "polygon",
    flags: annotation.flags || {},
  }
}

/** Build a LabelMe sidecar object for an image and its annotations. */
export function toLabelMe(
  image: Item,
  annotations: Annotation[]
): LabelMeFile {
  return {
    version: LABELME_VERSION,
    flags: image.flags || {},
    shapes: annotations.map(toShape),
    imagePath: image.imagePath || image.name,
    imageData: null,
    imageHeight: image.height,
    imageWidth: image.width,
  }
}

/**
 * Parse a LabelMe sidecar into partial annotations for the given image.
 * Returned annotations omit ids/timestamps so the caller can persist them.
 */
export function fromLabelMe(
  file: LabelMeFile,
  image: Item,
  projectId?: string
): Array<Partial<Annotation>> {
  if (!file || !Array.isArray(file.shapes)) return []

  return file.shapes.map((shape) => ({
    name: shape.label,
    type: SHAPE_TO_TYPE[shape.shape_type] || "polygon",
    coordinates: (shape.points || []).map(([x, y]) => ({ x, y })),
    groupId: shape.group_id ?? null,
    group_id: shape.group_id ?? null,
    flags: shape.flags || {},
    itemId: image.id,
    item_id: image.id,
    projectId: projectId || image.projectId || image.project_id,
    project_id: projectId || image.projectId || image.project_id,
  }))
}

/** The sidecar path for an image path: `/dir/foo.jpg` -> `/dir/foo.json`. */
export function sidecarPathFor(imagePath: string): string {
  const dot = imagePath.lastIndexOf(".")
  const base = dot > imagePath.lastIndexOf("/") ? imagePath.slice(0, dot) : imagePath
  return `${base}.json`
}
