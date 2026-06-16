import type { Annotation, ImageData } from "@/shared/types/core"
import { annotationBBox, baseName } from "./geometry"

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Pascal VOC XML for a single image. Every annotation with a bounding box
 * becomes an `<object>`; points are skipped (no box).
 */
export function toVocXml(image: ImageData, annotations: Annotation[]): string {
  const objects = annotations
    .map((annotation) => {
      const bbox = annotationBBox(annotation)
      if (!bbox) return null
      const xmin = Math.round(bbox.x)
      const ymin = Math.round(bbox.y)
      const xmax = Math.round(bbox.x + bbox.width)
      const ymax = Math.round(bbox.y + bbox.height)
      return `  <object>
    <name>${escapeXml(annotation.name)}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>${xmin}</xmin>
      <ymin>${ymin}</ymin>
      <xmax>${xmax}</xmax>
      <ymax>${ymax}</ymax>
    </bndbox>
  </object>`
    })
    .filter(Boolean)
    .join("\n")

  return `<annotation>
  <folder>images</folder>
  <filename>${escapeXml(image.imagePath || image.name)}</filename>
  <size>
    <width>${image.width}</width>
    <height>${image.height}</height>
    <depth>3</depth>
  </size>
  <segmented>0</segmented>
${objects}
</annotation>
`
}

/** Output file name for an image's VOC sidecar (`img.jpg` -> `img.xml`). */
export function vocFileName(image: ImageData): string {
  return `${baseName(image.name)}.xml`
}
