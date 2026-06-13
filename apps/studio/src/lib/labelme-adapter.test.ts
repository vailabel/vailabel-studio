import {
  fromLabelMe,
  sidecarPathFor,
  toLabelMe,
  type LabelMeFile,
} from "@/lib/labelme-adapter"
import type { Annotation, ImageData } from "@/types/core"

describe("labelme adapter", () => {
  const image = {
    id: "image-1",
    name: "sample.png",
    path: "/dataset/sample.png",
    imagePath: "sample.png",
    width: 640,
    height: 480,
    flags: { blurry: true },
  } as ImageData

  it("exports annotations to LabelMe shapes without embedding base64", () => {
    const annotations = [
      {
        id: "a1",
        name: "person",
        type: "polygon",
        coordinates: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 30, y: 40 },
        ],
      },
      {
        id: "a2",
        name: "car",
        type: "box",
        coordinates: [
          { x: 5, y: 5 },
          { x: 50, y: 60 },
        ],
      },
    ] as Annotation[]

    const file = toLabelMe(image, annotations)

    expect(file.imageData).toBeNull()
    expect(file.imagePath).toBe("sample.png")
    expect(file.imageWidth).toBe(640)
    expect(file.imageHeight).toBe(480)
    expect(file.flags).toEqual({ blurry: true })
    expect(file.shapes[0]).toMatchObject({
      label: "person",
      shape_type: "polygon",
      points: [
        [10, 20],
        [30, 20],
        [30, 40],
      ],
    })
    // box -> rectangle
    expect(file.shapes[1].shape_type).toBe("rectangle")
  })

  it("imports LabelMe shapes back into annotations", () => {
    const file: LabelMeFile = {
      version: "5.5.0",
      flags: {},
      imagePath: "sample.png",
      imageData: null,
      imageWidth: 640,
      imageHeight: 480,
      shapes: [
        {
          label: "dog",
          points: [
            [1, 2],
            [3, 4],
          ],
          group_id: 7,
          shape_type: "rectangle",
          flags: {},
        },
      ],
    }

    const imported = fromLabelMe(file, image, "project-1")

    expect(imported).toHaveLength(1)
    expect(imported[0]).toMatchObject({
      name: "dog",
      type: "box",
      group_id: 7,
      imageId: "image-1",
      projectId: "project-1",
      coordinates: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    })
  })

  it("derives the sidecar path from the image path", () => {
    expect(sidecarPathFor("/dataset/sample.png")).toBe("/dataset/sample.json")
    expect(sidecarPathFor("/d/a.b/img.jpeg")).toBe("/d/a.b/img.json")
  })
})
