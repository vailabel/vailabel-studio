import type { ControlTag } from "@/shared/lib/label-config/types"
import type { StoredResult } from "@/shared/lib/label-config/result"
import { colorForChoice } from "@/shared/lib/label-config/config-helpers"
import type { Pt, Region } from "./region-types"

/**
 * Normalize stored results for the spatial controls into flat, render-ready
 * regions (rectangles, polygons, keypoints), resolving each region's display
 * label and color from its control. Pure — derives view data from props.
 */
export function regionsFromResults(
  controls: ControlTag[],
  resultsByControl: Record<string, StoredResult[]>
): Region[] {
  const out: Region[] = []
  for (const control of controls) {
    for (const result of resultsByControl[control.name] ?? []) {
      const value = result.value as Record<string, unknown>
      const name =
        (value[control.tag] as string[] | undefined)?.[0] ?? control.name
      const color = colorForChoice(control, name)
      if (control.tag === "rectanglelabels") {
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
      } else if (control.tag === "polygonlabels") {
        out.push({
          id: result.id,
          tag: "polygonlabels",
          points: (value.points as Pt[]) ?? [],
          label: name,
          color,
        })
      } else if (control.tag === "keypointlabels") {
        out.push({
          id: result.id,
          tag: "keypointlabels",
          x: value.x as number,
          y: value.y as number,
          label: name,
          color,
        })
      }
    }
  }
  return out
}
