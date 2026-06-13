import type { Annotation, ImageData, Label, Point } from "@/types/core"
import { annotationBBox, baseName, clamp01, isPolygonal } from "./geometry"
import { buildCategoryIndex } from "./categories"

export interface YoloFile {
  /** `<image>.txt`. */
  name: string
  content: string
}

export interface YoloExport {
  classesTxt: string
  files: YoloFile[]
}

const fmt = (value: number) => clamp01(value).toFixed(6)

// Box corners as a normalized polygon (segmentation fallback for rectangles).
function boxPolygon(annotation: Annotation): Point[] {
  const bbox = annotationBBox(annotation)
  if (!bbox) return []
  return [
    { x: bbox.x, y: bbox.y },
    { x: bbox.x + bbox.width, y: bbox.y },
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    { x: bbox.x, y: bbox.y + bbox.height },
  ]
}

/**
 * YOLO labels. Detection emits `cls cx cy w h` (normalized); segmentation emits
 * `cls x1 y1 x2 y2 ...` (normalized polygon). One `.txt` per image plus a
 * `classes.txt` listing class names in id order.
 */
export function toYolo(
  images: ImageData[],
  annotationsByImage: Map<string, Annotation[]>,
  labels: Label[],
  options: { segmentation?: boolean } = {}
): YoloExport {
  const allAnnotations = images.flatMap(
    (image) => annotationsByImage.get(image.id) || []
  )
  const categoryIndex = buildCategoryIndex(labels, allAnnotations)
  const segmentation = options.segmentation ?? false

  const files: YoloFile[] = images.map((image) => {
    const width = image.width || 1
    const height = image.height || 1
    const lines: string[] = []

    for (const annotation of annotationsByImage.get(image.id) || []) {
      const classId = categoryIndex.indexOf(annotation.name)
      if (classId < 0) continue

      if (segmentation) {
        const polygon = isPolygonal(annotation)
          ? annotation.coordinates
          : boxPolygon(annotation)
        if (polygon.length < 3) continue
        const coords = polygon
          .map((p) => `${fmt(p.x / width)} ${fmt(p.y / height)}`)
          .join(" ")
        lines.push(`${classId} ${coords}`)
      } else {
        const bbox = annotationBBox(annotation)
        if (!bbox) continue
        const cx = (bbox.x + bbox.width / 2) / width
        const cy = (bbox.y + bbox.height / 2) / height
        lines.push(
          `${classId} ${fmt(cx)} ${fmt(cy)} ${fmt(bbox.width / width)} ${fmt(
            bbox.height / height
          )}`
        )
      }
    }

    return { name: `${baseName(image.name)}.txt`, content: `${lines.join("\n")}\n` }
  })

  return {
    classesTxt: `${categoryIndex.names.join("\n")}\n`,
    files,
  }
}
