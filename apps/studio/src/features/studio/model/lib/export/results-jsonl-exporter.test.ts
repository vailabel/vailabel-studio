import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { toResultsJsonl } from "./results-jsonl-exporter"

const asItem = (fields: Partial<Item>): Item =>
  ({ width: 0, height: 0, ...fields }) as Item

const result = (
  id: string,
  fromName: string,
  value: Record<string, unknown>
): Annotation =>
  ({
    id,
    name: fromName,
    type: "result",
    coordinates: [],
    meta: { kind: "result", fromName, toName: "prompt", resultType: "choices", value },
  }) as Annotation

const config: LabelConfig = {
  objects: [
    { tag: "text", name: "prompt", value: "$prompt", valueKey: "prompt", attrs: {} },
  ],
  controls: [],
}

describe("toResultsJsonl", () => {
  it("writes one {id, data, results} line per item, keyed by control name", () => {
    const items = [
      { id: "i1", name: "row-1", path: "", data: { prompt: "Hi", answer: "Hello" } },
      { id: "i2", name: "row-2", path: "", data: { prompt: "Bye" } },
    ].map(asItem)
    const byItem = new Map([
      [
        "i1",
        [
          result("a1", "verdict", { choices: ["good"] }),
          result("a2", "score", { rating: 4 }),
        ],
      ],
    ])

    const lines = toResultsJsonl(items, byItem, config)
      .split("\n")
      .map((line) => JSON.parse(line))

    expect(lines).toEqual([
      {
        id: "i1",
        data: { prompt: "Hi", answer: "Hello" },
        results: { verdict: { choices: ["good"] }, score: { rating: 4 } },
      },
      { id: "i2", data: { prompt: "Bye" }, results: {} },
    ])
  })

  it("collects several results of one control into an array", () => {
    const items = [{ id: "i1", name: "a", path: "", data: { prompt: "x" } }].map(asItem)
    const byItem = new Map([
      ["i1", [result("a1", "tags", { choices: ["a"] }), result("a2", "tags", { choices: ["b"] })]],
    ])
    const [line] = toResultsJsonl(items, byItem).split("\n").map((l) => JSON.parse(l))
    expect(line.results).toEqual({ tags: [{ choices: ["a"] }, { choices: ["b"] }] })
  })

  it("resolves object fields to the item file for file-backed items", () => {
    const items = [{ id: "i1", name: "doc.txt", path: "/ds/doc.txt" }].map(asItem)
    const [line] = toResultsJsonl(items, new Map(), config)
      .split("\n")
      .map((l) => JSON.parse(l))
    expect(line.data).toEqual({ prompt: "/ds/doc.txt" })
  })

  it("surfaces native classification annotations under `label`", () => {
    const items = [{ id: "i1", name: "r", path: "", data: { a: 1 } }].map(asItem)
    const byItem = new Map([
      ["i1", [{ id: "c1", name: "spam", type: "classification", coordinates: [] } as Annotation]],
    ])
    const [line] = toResultsJsonl(items, byItem).split("\n").map((l) => JSON.parse(l))
    expect(line.results).toEqual({ label: { choices: ["spam"] } })
  })
})
