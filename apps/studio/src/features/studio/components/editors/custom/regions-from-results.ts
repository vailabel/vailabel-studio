import type { ControlTag } from "@/shared/lib/label-config/types"
import { shapeTagOf, type StoredResult } from "@/shared/lib/label-config/result"
import { colorForChoice } from "@/shared/lib/label-config/config-helpers"
import { decodeMask } from "@/features/studio/model/lib/brush-rle"
import type { Pt, Region } from "./region-types"

/** Top-left of a mask's covered pixels, in % of the raster. */
function maskAnchor(mask: Uint8Array, width: number, height: number): Pt {
  let minX = width
  let minY = height
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const x = i % width
    const y = (i - x) / width
    if (x < minX) minX = x
    if (y < minY) minY = y
  }
  return minX === width ? [0, 0] : [(minX / width) * 100, (minY / height) * 100]
}

/**
 * Normalize stored results for the spatial controls into flat, render-ready
 * regions (rectangles, ellipses, polygons, keypoints, brush masks), resolving
 * each region's display label and color from its control. Unlabeled shapes
 * (<Rectangle>, …) render as their labeled twin, named after the control.
 * Pure — derives view data from props.
 */
export function regionsFromResults(
  controls: ControlTag[],
  resultsByControl: Record<string, StoredResult[]>
): Region[] {
  const out: Region[] = []
  for (const control of controls) {
    const shape = shapeTagOf(control.tag)
    for (const result of resultsByControl[control.name] ?? []) {
      const value = result.value as Record<string, unknown>
      const name = (value[shape] as string[] | undefined)?.[0] ?? control.name
      const color =
        shape === control.tag
          ? colorForChoice(control, name)
          : (control.attrs.strokecolor ?? "#64748b")
      if (shape === "rectanglelabels") {
        out.push({
          id: result.id,
          tag: "rectanglelabels",
          x: value.x as number,
          y: value.y as number,
          width: value.width as number,
          height: value.height as number,
          label: name,
          color,
        })
      } else if (shape === "polygonlabels") {
        out.push({
          id: result.id,
          tag: "polygonlabels",
          points: (value.points as Pt[]) ?? [],
          label: name,
          color,
        })
      } else if (shape === "ellipselabels") {
        out.push({
          id: result.id,
          tag: "ellipselabels",
          x: value.x as number,
          y: value.y as number,
          radiusX: value.radiusX as number,
          radiusY: value.radiusY as number,
          label: name,
          color,
        })
      } else if (shape === "keypointlabels") {
        out.push({
          id: result.id,
          tag: "keypointlabels",
          x: value.x as number,
          y: value.y as number,
          label: name,
          color,
        })
      } else if (shape === "brushlabels") {
        const width = Number(value.original_width) || 0
        const height = Number(value.original_height) || 0
        if (!width || !height || !Array.isArray(value.rle)) continue
        const mask = decodeMask(value.rle as number[], width, height)
        out.push({
          id: result.id,
          tag: "brushlabels",
          mask,
          width,
          height,
          anchor: maskAnchor(mask, width, height),
          label: name,
          color,
        })
      }
    }
  }
  return out
}
