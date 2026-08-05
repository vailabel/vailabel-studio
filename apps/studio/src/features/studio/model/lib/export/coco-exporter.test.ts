import type { Annotation, Item, Label } from "@/shared/types/core"
import { toCoco } from "./coco-exporter"

type CocoDoc = {
  images: Array<{ id: number; file_name: string; width: number; height: number }>
  annotations: Array<Record<string, unknown>>
  categories: Array<{ id: number; name: string }>
}

const image = (id: string, name: string): Item =>
  ({ id, name, path: `/ds/${name}`, imagePath: name, width: 100, height: 50 }) as Item

const box = (id: string, name: string, itemId: string): Annotation =>
  ({
    id,
    name,
    type: "box",
    itemId,
    coordinates: [
      { x: 10, y: 20 },
      { x: 30, y: 45 },
    ],
  }) as Annotation

const polygon = (id: string, name: string, itemId: string): Annotation =>
  ({
    id,
    name,
    type: "polygon",
    itemId,
    coordinates: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
  }) as Annotation

const labels = [{ id: "l1", name: "cat" } as Label, { id: "l2", name: "dog" } as Label]

function build(): CocoDoc {
  const images = [image("i1", "a.jpg"), image("i2", "b.jpg")]
  const byImage = new Map<string, Annotation[]>([
    ["i1", [box("a1", "cat", "i1"), polygon("a2", "dog", "i1")]],
    ["i2", [box("a3", "dog", "i2")]],
  ])
  return toCoco(images, byImage, labels) as unknown as CocoDoc
}

describe("toCoco", () => {
  // Regression: the image->item rename leaked into this external wire format and
  // emitted `item_id`, which every COCO consumer (including our own importer)
  // ignores — so a round-trip silently dropped every annotation.
  it("links annotations to images with the spec's `image_id` field", () => {
    const doc = build()

    for (const annotation of doc.annotations) {
      expect(annotation).toHaveProperty("image_id")
      expect(annotation).not.toHaveProperty("item_id")
    }

    expect(doc.annotations.map((a) => a.image_id)).toEqual([1, 1, 2])
  })

  it("points every annotation's image_id at an existing image id", () => {
    const doc = build()
    const imageIds = new Set(doc.images.map((entry) => entry.id))

    expect(doc.annotations).toHaveLength(3)
    for (const annotation of doc.annotations) {
      expect(imageIds.has(annotation.image_id as number)).toBe(true)
    }
  })

  it("uses 1-based image, annotation and category ids", () => {
    const doc = build()

    expect(doc.images.map((entry) => entry.id)).toEqual([1, 2])
    expect(doc.annotations.map((a) => a.id)).toEqual([1, 2, 3])
    expect(doc.categories).toEqual([
      { id: 1, name: "cat", supercategory: "" },
      { id: 2, name: "dog", supercategory: "" },
    ])
    expect(doc.annotations.map((a) => a.category_id)).toEqual([1, 2, 2])
  })

  it("emits bbox for boxes and segmentation only for polygonal shapes", () => {
    const doc = build()
    const [boxAnn, polygonAnn] = doc.annotations

    expect(boxAnn.bbox).toEqual([10, 20, 20, 25])
    expect(boxAnn.segmentation).toEqual([])
    expect(boxAnn.area).toBe(500)

    expect(polygonAnn.segmentation).toEqual([[0, 0, 10, 0, 10, 10]])
    expect(polygonAnn.area).toBe(50)
  })
})
