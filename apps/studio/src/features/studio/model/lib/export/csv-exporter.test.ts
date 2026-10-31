import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { csvField, resultCell, toCsv } from "./csv-exporter"

const asItem = (fields: Partial<Item>): Item =>
  ({ width: 0, height: 0, ...fields }) as Item

const classification = (id: string, name: string): Annotation =>
  ({ id, name, type: "classification", coordinates: [] }) as Annotation

const result = (fromName: string, value: Record<string, unknown>): Annotation =>
  ({
    id: `r-${fromName}`,
    name: fromName,
    type: "result",
    coordinates: [],
    meta: { kind: "result", fromName, toName: "table", resultType: "choices", value },
  }) as Annotation

describe("csvField", () => {
  it("quotes fields with commas, quotes or line breaks", () => {
    expect(csvField("plain")).toBe("plain")
    expect(csvField("a,b")).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField("two\nlines")).toBe('"two\nlines"')
    expect(csvField(undefined)).toBe("")
    expect(csvField(3)).toBe("3")
  })
})

describe("resultCell", () => {
  it("flattens single-key primitive payloads and keeps richer ones as-is", () => {
    expect(resultCell({ choices: ["a", "b"] })).toBe("a;b")
    expect(resultCell({ rating: 4 })).toBe(4)
    const region = { x: 1, y: 2 }
    expect(resultCell(region)).toBe(region)
  })
})

describe("toCsv", () => {
  it("writes the row's data columns followed by the label column", () => {
    const items = [
      { id: "i1", name: "r1", path: "", data: { name: "Ann", age: 30 } },
      { id: "i2", name: "r2", path: "", data: { name: "Bo, Jr.", city: "Oslo" } },
    ].map(asItem)
    const byItem = new Map([["i1", [classification("c1", "vip")]]])

    expect(toCsv(items, byItem)).toBe(
      ["name,age,city,label", "Ann,30,,vip", '"Bo, Jr.",,Oslo,', ""].join("\n")
    )
  })

  it("uses one column per configured control, suffixing name clashes", () => {
    const config: LabelConfig = {
      objects: [],
      controls: [
        { tag: "choices", name: "sentiment", toName: "t", toNames: ["t"], choices: [], attrs: {} },
        { tag: "rating", name: "score", toName: "t", toNames: ["t"], choices: [], attrs: {} },
      ],
    }
    const items = [
      { id: "i1", name: "r1", path: "", data: { text: "ok", score: 1 } },
    ].map(asItem)
    const byItem = new Map([
      ["i1", [result("sentiment", { choices: ["pos"] }), result("score", { rating: 5 })]],
    ])

    expect(toCsv(items, byItem, config)).toBe(
      ["text,score,sentiment,score_label", "ok,1,pos,5", ""].join("\n")
    )
  })
})
