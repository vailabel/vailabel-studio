import {
  createLabelStudioTask,
  fromLabelStudioTask,
} from "@/lib/label-studio-adapter"
import type { AIModel, ImageData, Prediction } from "@/types/core"

describe("label studio adapter", () => {
  it("exports image predictions to a Label Studio-compatible task", () => {
    const image = {
      id: "image-1",
      name: "sample.png",
      data: "data:image/png;base64,abc",
      width: 1000,
      height: 500,
    } as ImageData
    const model = {
      id: "model-1",
      name: "YOLO26 Detection",
      modelVersion: "YOLO26n",
      version: "26.0.0",
    } as AIModel
    const predictions = [
      {
        id: "prediction-1",
        name: "Vehicle",
        type: "box",
        coordinates: [
          { x: 100, y: 50 },
          { x: 600, y: 250 },
        ],
        confidence: 0.88,
      },
    ] as Prediction[]

    const task = createLabelStudioTask({ image, predictions, model })

    expect(task.data.image).toBe(image.data)
    expect(task.predictions[0].model_version).toBe("YOLO26n")
    expect(task.predictions[0].result[0]).toMatchObject({
      id: "prediction-1",
      from_name: "label",
      to_name: "image",
      type: "rectanglelabels",
    })
    expect(task.predictions[0].result[0].value).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 40,
      rotation: 0,
      rectanglelabels: ["Vehicle"],
    })
  })

  it("imports Label Studio rectangle predictions back into local predictions", () => {
    const image = {
      id: "image-1",
      name: "sample.png",
      data: "data:image/png;base64,abc",
      width: 1000,
      height: 500,
    } as ImageData

    const imported = fromLabelStudioTask({
      image,
      modelId: "model-1",
      projectId: "project-1",
      task: {
        data: {
          image: image.data,
        },
        predictions: [
          {
            model_version: "YOLO26n",
            result: [
              {
                id: "ls-1",
                from_name: "label",
                to_name: "image",
                type: "rectanglelabels",
                score: 0.75,
                value: {
                  x: 10,
                  y: 10,
                  width: 50,
                  height: 40,
                  rectanglelabels: ["Vehicle"],
                },
              },
            ],
          },
        ],
      },
    })

    expect(imported).toHaveLength(1)
    expect(imported[0]).toMatchObject({
      id: "ls-1",
      name: "Vehicle",
      type: "box",
      modelId: "model-1",
      projectId: "project-1",
      modelVersion: "YOLO26n",
      fromName: "label",
      toName: "image",
      resultType: "rectanglelabels",
    })
    expect(imported[0].coordinates).toEqual([
      { x: 100, y: 50 },
      { x: 600, y: 250 },
    ])
  })
})
