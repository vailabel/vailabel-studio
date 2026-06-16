import { parseLabelConfig } from "./parse"
import { inferModalityTask } from "./infer"

const infer = (json: string) => inferModalityTask(parseLabelConfig(json))

describe("inferModalityTask", () => {
  it("routes single-task image configs to the canvas editor", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "image", name: "image", value: "$image" }],
          controls: [{ tag: "rectanglelabels", name: "b", toName: "image", labels: ["X"] }],
        })
      )
    ).toEqual({ modality: "image", task: "detection" })

    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "image", name: "image", value: "$image" }],
          controls: [{ tag: "polygonlabels", name: "p", toName: "image", labels: ["X"] }],
        })
      )
    ).toEqual({ modality: "image", task: "segmentation" })
  })

  it("routes single-task text configs to the text editor", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "text", name: "t", value: "$text" }],
          controls: [{ tag: "labels", name: "l", toName: "t", labels: ["PER"] }],
        })
      )
    ).toEqual({ modality: "text", task: "ner" })

    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "text", name: "t", value: "$text" }],
          controls: [
            { tag: "labels", name: "l", toName: "t", labels: ["PER"] },
            { tag: "relations", name: "r", toName: "t" },
          ],
        })
      )
    ).toEqual({ modality: "text", task: "relation_extraction" })
  })

  it("routes audio label configs to audio classification", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "audio", name: "a", value: "$audio" }],
          controls: [{ tag: "labels", name: "l", toName: "a", labels: ["Speech"] }],
        })
      )
    ).toEqual({ modality: "audio", task: "audio_classification" })
  })

  it("routes combined-control configs to the custom engine", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "image", name: "image", value: "$image" }],
          controls: [
            { tag: "rectanglelabels", name: "b", toName: "image", labels: ["X"] },
            { tag: "textarea", name: "notes", toName: "image" },
          ],
        })
      )
    ).toEqual({ modality: "custom" })
  })

  it("falls back to custom for unknown objects (table/video/…)", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "table", name: "t", value: "$t" }],
          controls: [{ tag: "choices", name: "c", toName: "t", labels: ["A"] }],
        })
      )
    ).toEqual({ modality: "custom" })
  })
})
