import { describeImport, expectedColumns } from "./import-guide"
import { descriptorForKind } from "./modality-registry"
import { parseLabelConfig } from "@/shared/lib/label-config/parse"

const rlhf = parseLabelConfig(
  JSON.stringify({
    objects: [
      { tag: "text", name: "prompt", value: "$prompt", attrs: { title: "Prompt" } },
      {
        tag: "text",
        name: "response_a",
        value: "$response_a",
        attrs: { title: "Response A" },
      },
      {
        tag: "text",
        name: "response_b",
        value: "$response_b",
        attrs: { title: "Response B" },
      },
    ],
    controls: [
      {
        tag: "pairwise",
        name: "pref",
        toName: "response_a",
        toNames: ["response_a", "response_b"],
      },
    ],
  })
)

function descriptor(kind: "image" | "tabular") {
  const found = descriptorForKind(kind)
  if (!found) throw new Error(`missing ${kind} descriptor`)
  return found
}

describe("expectedColumns", () => {
  it("derives the $-bound text fields with their titles", () => {
    expect(expectedColumns(rlhf)).toEqual([
      { key: "prompt", label: "Prompt" },
      { key: "response_a", label: "Response A" },
      { key: "response_b", label: "Response B" },
    ])
  })

  it("excludes a whole-row table object", () => {
    const config = parseLabelConfig(
      JSON.stringify({
        objects: [{ tag: "table", name: "table", value: "$item" }],
        controls: [{ tag: "choices", name: "c", toName: "table", labels: ["A"] }],
      })
    )
    expect(expectedColumns(config)).toEqual([])
  })

  it("returns [] for a null config", () => {
    expect(expectedColumns(null)).toEqual([])
  })
})

describe("describeImport", () => {
  it("lists the expected columns for spreadsheet (LLM-eval) imports", () => {
    const guide = describeImport(descriptor("tabular"), rlhf)
    expect(guide.columns.map((column) => column.key)).toEqual([
      "prompt",
      "response_a",
      "response_b",
    ])
    expect(guide.formats).toContain("csv")
  })

  it("builds a CSV example whose header matches the expected columns", () => {
    const guide = describeImport(descriptor("tabular"), rlhf)
    const [header] = guide.example.split("\n")
    expect(header).toBe("prompt,response_a,response_b")
    // The example has a header row + one sample data row.
    expect(guide.example.split("\n")).toHaveLength(2)
  })

  it("has no columns for image folder imports and cleans regex from formats", () => {
    const guide = describeImport(descriptor("image"), null)
    expect(guide.columns).toEqual([])
    expect(guide.formats).toContain("jpeg")
    expect(guide.formats).not.toContain("?")
    expect(guide.example).toContain(".jpg")
  })
})
