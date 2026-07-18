import { itemKind } from "./item-kind"
import type { Item } from "@/shared/types/core"

const baseItem: Item = {
  id: "item-1",
  name: "test-item",
  width: 100,
  height: 100,
  path: "",
}

describe("itemKind", () => {
  it("classifies image extensions", () => {
    expect(itemKind({ ...baseItem, path: "photo.png" })).toBe("image")
  })

  it("classifies audio extensions", () => {
    expect(itemKind({ ...baseItem, path: "clip.mp3" })).toBe("audio")
  })

  it("classifies tabular rows with inline data and no file path", () => {
    expect(itemKind({ ...baseItem, data: {}, path: "" })).toBe("tabular")
  })

  it("falls back to text for unrecognized extensions", () => {
    expect(itemKind({ ...baseItem, path: "notes.xyz" })).toBe("text")
  })
})