import type { Annotation, Item } from "@/shared/types/core"
import { cuboidValue } from "@/shared/lib/label-config/result"
import { toKitti, toKittiLabels } from "./kitti-exporter"

const cuboid = (id: string, label: string) =>
  ({
    id,
    name: "box",
    meta: {
      kind: "result",
      fromName: "box",
      toName: "pointcloud",
      resultType: "cuboidlabels",
      value: cuboidValue(
        { x: 10, y: -2, z: 0.75, length: 4.2, width: 1.8, height: 1.5, yaw: 0.5 },
        [label]
      ),
    },
  }) as unknown as Annotation

describe("KITTI export", () => {
  it("writes one line per cuboid with bottom-center location", () => {
    expect(toKittiLabels([cuboid("a", "Traffic cone")])).toBe(
      "Traffic_cone 0.00 0 0.50 0.00 0.00 0.00 0.00 1.50 1.80 4.20 10.00 -2.00 0.00 0.50"
    )
  })

  it("ignores non-cuboid results and writes a file per scan", () => {
    const items = [
      { id: "1", name: "scan-1.pcd" },
      { id: "2", name: "scan-2.pcd" },
    ] as Item[]
    const files = toKitti(items, new Map([["1", [cuboid("a", "Car")]]]))
    expect(files.map((file) => file.name)).toEqual(["label_2/scan-1.txt", "label_2/scan-2.txt"])
    expect(files[0].content.trim().split("\n")).toHaveLength(1)
    expect(files[1].content).toBe("")
  })
})
