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

  it("routes a table object to whole-row tabular classification", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "table", name: "t", value: "$t" }],
          controls: [{ tag: "choices", name: "c", toName: "t", labels: ["A"] }],
        })
      )
    ).toEqual({ modality: "tabular", task: "classification" })
  })

  it("routes multi-text LLM-eval configs (prompt + responses) to the custom engine", () => {
    // RLHF: two response fields scored by a pairwise control → config editor.
    expect(
      infer(
        JSON.stringify({
          objects: [
            { tag: "text", name: "prompt", value: "$prompt" },
            { tag: "text", name: "response_a", value: "$response_a" },
            { tag: "text", name: "response_b", value: "$response_b" },
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
    ).toEqual({ modality: "custom" })

    // Grading: prompt + response scored by rating/choices/textarea.
    expect(
      infer(
        JSON.stringify({
          objects: [
            { tag: "text", name: "prompt", value: "$prompt" },
            { tag: "text", name: "response", value: "$response" },
          ],
          controls: [
            { tag: "rating", name: "q", toName: "response" },
            { tag: "choices", name: "v", toName: "response", labels: ["Correct"] },
          ],
        })
      )
    ).toEqual({ modality: "custom" })
  })

  it("keeps a multi-text config in its native editor when it has span labeling", () => {
    // Question answering (text + question, but a span `labels` control) stays a
    // single-document text task, not a whole-text judgement.
    expect(
      infer(
        JSON.stringify({
          objects: [
            { tag: "text", name: "text", value: "$text" },
            { tag: "text", name: "question", value: "$question" },
          ],
          controls: [{ tag: "labels", name: "answer", toName: "text", labels: ["Answer"] }],
        })
      )
    ).toEqual({ modality: "text", task: "ner" })
  })

  it("falls back to custom for unsupported objects (timeseries/…)", () => {
    expect(
      infer(
        JSON.stringify({
          objects: [{ tag: "timeseries", name: "ts", value: "$ts" }],
          controls: [
            { tag: "timeserieslabels", name: "c", toName: "ts", labels: ["A"] },
          ],
        })
      )
    ).toEqual({ modality: "custom" })
  })
})
