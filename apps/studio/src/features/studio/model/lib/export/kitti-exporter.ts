import type { Annotation, Item } from "@/shared/types/core"
import { resultsFromAnnotations } from "@/shared/lib/label-config/result"
import { baseName } from "./geometry"

// KITTI object labels for point cloud cuboids: one label_2/<scan>.txt per item,
// one line per box —
//   type truncated occluded alpha left top right bottom h w l x y z rotation_y
// The 2D image box is unknown (zeros) and truncation / occlusion are not
// annotated. Coordinates stay in the LiDAR frame the boxes were drawn in
// (x forward, y left, z up): location is the box's bottom-center and
// rotation_y is the yaw about z. Apply the sensor calibration to move them into
// a camera frame.

const n = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "0.00")

/** KITTI's type field: one token, no spaces. */
const kittiType = (label: string) => label.trim().replace(/\s+/g, "_") || "DontCare"

/** One KITTI label line per cuboid on an item. */
export function toKittiLabels(annotations: Annotation[]): string {
  return resultsFromAnnotations(annotations)
    .filter((result) => result.resultType === "cuboidlabels")
    .map((result) => {
      const box = result.value as Record<string, number> & { cuboidlabels?: string[] }
      const type = kittiType(box.cuboidlabels?.[0] ?? result.fromName)
      const yaw = Number(box.yaw) || 0
      return [
        type,
        "0.00",
        "0",
        n(yaw),
        "0.00 0.00 0.00 0.00",
        n(box.height),
        n(box.width),
        n(box.length),
        n(box.x),
        n(box.y),
        n(box.z - box.height / 2),
        n(yaw),
      ].join(" ")
    })
    .join("\n")
}

/** label_2/<scan>.txt for every item (empty files keep scan ↔ label pairing). */
export function toKitti(
  items: Item[],
  annotationsByItem: Map<string, Annotation[]>
): Array<{ name: string; content: string }> {
  return items.map((item) => {
    const lines = toKittiLabels(annotationsByItem.get(item.id) ?? [])
    return { name: `label_2/${baseName(item.name)}.txt`, content: lines ? `${lines}\n` : "" }
  })
}
