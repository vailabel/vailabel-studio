import type { Annotation, Item } from "@/shared/types/core"
import { choicesValue, rectangleValue } from "@/shared/lib/label-config/result"
import { toMedicalJson } from "./medical-exporter"

const series = {
  uid: "1.2.3",
  description: "Chest",
  modality: "CT",
  rows: 128,
  columns: 128,
  slices: [
    { path: "/a/IM1", frame: 0, sopUid: "1.2.3.1" },
    { path: "/a/IM2", frame: 0, sopUid: "1.2.3.2" },
  ],
}

const result = (id: string, fromName: string, resultType: string, value: Record<string, unknown>) =>
  ({ id, name: fromName, meta: { kind: "result", fromName, toName: "dicom", resultType, value } }) as unknown as Annotation

describe("medical JSON export", () => {
  it("groups regions by slice and keeps series answers apart", () => {
    const item = { id: "i1", name: "Chest", data: { series: JSON.stringify(series) } } as unknown as Item
    const [record] = toMedicalJson(
      [item],
      new Map([
        [
          "i1",
          [
            result("r1", "finding", "rectanglelabels", { ...rectangleValue(1, 2, 3, 4, ["Nodule"]), slice: 1, sopInstanceUid: "1.2.3.2" }),
            result("r2", "assessment", "choices", choicesValue(["Benign"])),
          ],
        ],
      ])
    )
    expect(record.series).toMatchObject({ uid: "1.2.3", sliceCount: 2 })
    expect(record.slices).toEqual([
      {
        index: 1,
        sopInstanceUid: "1.2.3.2",
        regions: [
          {
            id: "r1",
            control: "finding",
            type: "rectanglelabels",
            value: rectangleValue(1, 2, 3, 4, ["Nodule"]),
          },
        ],
      },
    ])
    expect(record.answers).toEqual({ assessment: { choices: ["Benign"] } })
  })
})
