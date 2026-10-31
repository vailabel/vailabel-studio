import { describe, expect, it } from "vitest"
import type { Label, Prediction } from "@/shared/types/core"
import {
  PALETTE_COLORS,
  boundsOf,
  findLabelByName,
  iou,
  nextPaletteColor,
  orderLabelsForPalette,
  suggestClassesForShape,
} from "./label-palette"

const label = (
  id: string,
  name: string,
  extra: Partial<Label> = {}
): Label => ({
  id,
  name,
  color: "#000000",
  ...extra,
})

const box = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y: y + h },
]

const prediction = (
  id: string,
  name: string,
  coordinates: Array<{ x: number; y: number }>,
  confidence: number,
  extra: Partial<Prediction> = {}
): Prediction => ({ id, name, type: "box", coordinates, confidence, ...extra })

describe("nextPaletteColor", () => {
  it("returns the first unused palette color", () => {
    expect(nextPaletteColor([])).toBe(PALETTE_COLORS[0])
    expect(nextPaletteColor([{ color: PALETTE_COLORS[0].toUpperCase() }])).toBe(
      PALETTE_COLORS[1]
    )
  })

  it("cycles once every palette color is taken", () => {
    const taken = PALETTE_COLORS.map((color) => ({ color }))
    expect(PALETTE_COLORS).toContain(nextPaletteColor(taken))
  })
})

describe("orderLabelsForPalette", () => {
  it("groups by category alphabetically with Uncategorized last, stable inside groups", () => {
    const labels = [
      label("1", "tree"),
      label("2", "car", { category: "Vehicles" }),
      label("3", "person", { category: "Animals" }),
      label("4", "bus", { category: "Vehicles" }),
      label("5", "sky"),
    ]
    expect(orderLabelsForPalette(labels).map((l) => l.id)).toEqual([
      "3",
      "2",
      "4",
      "1",
      "5",
    ])
  })
})

describe("findLabelByName", () => {
  it("matches case-insensitively and ignores blanks", () => {
    const labels = [label("1", "Car")]
    expect(findLabelByName(labels, "  car ")?.id).toBe("1")
    expect(findLabelByName(labels, " ")).toBeUndefined()
  })
})

describe("geometry", () => {
  it("computes bounds and IoU", () => {
    const a = boundsOf(box(0, 0, 10, 10))!
    const b = boundsOf(box(5, 0, 10, 10))!
    expect(a).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
    expect(iou(a, a)).toBe(1)
    expect(iou(a, b)).toBeCloseTo(50 / 150)
    expect(iou(a, boundsOf(box(20, 20, 5, 5))!)).toBe(0)
    expect(boundsOf([])).toBeNull()
  })
})

describe("suggestClassesForShape", () => {
  const labels = [label("car-id", "car", { color: "#ff0000" })]

  it("suggests overlapping predictions, best first, deduplicated by class", () => {
    const predictions = [
      prediction("p1", "truck", box(0, 0, 10, 10), 0.6),
      prediction("p2", "car", box(1, 1, 10, 10), 0.95),
      prediction("p3", "car", box(0, 0, 10, 10), 0.5),
      prediction("p4", "dog", box(50, 50, 10, 10), 0.99),
    ]
    const suggestions = suggestClassesForShape(
      box(0, 0, 10, 10),
      predictions,
      labels
    )
    expect(suggestions.map((s) => s.name)).toEqual(["car", "truck"])
    expect(suggestions[0].label?.id).toBe("car-id")
    expect(suggestions[0].confidence).toBe(0.95)
    expect(suggestions[1].label).toBeUndefined()
  })

  it("resolves the class by prediction labelId first", () => {
    const predictions = [
      prediction("p1", "vehicle", box(0, 0, 10, 10), 0.8, {
        labelId: "car-id",
      }),
    ]
    const [suggestion] = suggestClassesForShape(
      box(0, 0, 10, 10),
      predictions,
      labels
    )
    expect(suggestion.name).toBe("car")
    expect(suggestion.color).toBe("#ff0000")
  })

  it("returns nothing without overlap or points", () => {
    const predictions = [prediction("p1", "car", box(100, 100, 5, 5), 0.9)]
    expect(
      suggestClassesForShape(box(0, 0, 10, 10), predictions, labels)
    ).toEqual([])
    expect(suggestClassesForShape([], predictions, labels)).toEqual([])
  })
})
