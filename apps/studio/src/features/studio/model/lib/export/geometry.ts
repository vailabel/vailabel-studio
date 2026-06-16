import type { Annotation, Point } from "@/shared/types/core"

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

/** Shape types that carry a closed/segmentable outline. */
const POLYGONAL_TYPES = new Set(["polygon", "linestrip", "freeDraw"])

export function isPolygonal(annotation: Annotation): boolean {
  return POLYGONAL_TYPES.has(annotation.type) && annotation.coordinates.length >= 3
}

/**
 * Axis-aligned bounding box for any annotation, in image pixel coordinates.
 * `box` corners and general point sets reduce to min/max; circles use the
 * center + edge radius. Returns null for shapes without enough points.
 */
export function annotationBBox(annotation: Annotation): BBox | null {
  const coords = annotation.coordinates
  if (!coords || coords.length === 0) return null

  if (annotation.type === "circle" && coords.length >= 2) {
    const radius = Math.hypot(coords[1].x - coords[0].x, coords[1].y - coords[0].y)
    return {
      x: coords[0].x - radius,
      y: coords[0].y - radius,
      width: radius * 2,
      height: radius * 2,
    }
  }

  if (annotation.type === "point") return null

  const xs = coords.map((p) => p.x)
  const ys = coords.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  }
}

/** Flatten polygon vertices to `[x1, y1, x2, y2, ...]` (COCO segmentation). */
export function flattenPolygon(coords: Point[]): number[] {
  return coords.flatMap((p) => [p.x, p.y])
}

/** Shoelace polygon area in pixels². */
export function polygonArea(coords: Point[]): number {
  let area = 0
  for (let i = 0; i < coords.length; i += 1) {
    const j = (i + 1) % coords.length
    area += coords[i].x * coords[j].y - coords[j].x * coords[i].y
  }
  return Math.abs(area) / 2
}

/** Clamp a 0–1 normalized value, guarding against tiny float overflows. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** Image file name without its extension (e.g. `img.jpg` -> `img`). */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "")
}
