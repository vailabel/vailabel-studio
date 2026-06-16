import type { Annotation } from "@/shared/types/core"
import {
  resultsFromAnnotations,
  resultsForControl,
  toLabelStudioResults,
  choicesValue,
  labelsValue,
  rectangleValue,
  polygonValue,
  keypointValue,
  relationValue,
} from "./result"

const annotations = [
  {
    id: "r1",
    name: "box",
    meta: {
      kind: "result",
      fromName: "box",
      toName: "img",
      resultType: "rectanglelabels",
      value: rectangleValue(10, 20, 30, 40, ["Car"]),
    },
  },
  {
    id: "r2",
    name: "quality",
    meta: {
      kind: "result",
      fromName: "quality",
      toName: "img",
      resultType: "choices",
      value: choicesValue(["clear"]),
    },
  },
  { id: "x", name: "other", meta: { kind: "spatial" } },
] as unknown as Annotation[]

describe("resultsFromAnnotations", () => {
  it("keeps only result-meta annotations", () => {
    expect(resultsFromAnnotations(annotations).map((r) => r.id)).toEqual([
      "r1",
      "r2",
    ])
  })
})

describe("resultsForControl", () => {
  it("filters by the control name (from_name)", () => {
    const forBox = resultsForControl(annotations, "box")
    expect(forBox).toHaveLength(1)
    expect(forBox[0].value).toMatchObject({ rectanglelabels: ["Car"] })
  })
})

describe("toLabelStudioResults", () => {
  it("emits the Label Studio result envelope", () => {
    const results = toLabelStudioResults(annotations)
    expect(results[0]).toEqual({
      id: "r1",
      from_name: "box",
      to_name: "img",
      type: "rectanglelabels",
      value: { x: 10, y: 20, width: 30, height: 40, rotation: 0, rectanglelabels: ["Car"] },
    })
    expect(results[1].type).toBe("choices")
  })
})

describe("value builders", () => {
  it("labelsValue builds an NER value", () => {
    expect(labelsValue(0, 5, "apple", ["Fruit"])).toEqual({
      start: 0,
      end: 5,
      text: "apple",
      labels: ["Fruit"],
    })
  })

  it("polygonValue and keypointValue build spatial values", () => {
    expect(polygonValue([[1, 2], [3, 4]], ["Leaf"])).toEqual({
      points: [[1, 2], [3, 4]],
      polygonlabels: ["Leaf"],
    })
    expect(keypointValue(50, 60, ["Nose"])).toEqual({
      x: 50,
      y: 60,
      width: 0.6,
      keypointlabels: ["Nose"],
    })
  })

  it("relationValue builds a directed link", () => {
    expect(relationValue("a", "b", ["rel"])).toEqual({
      from_id: "a",
      to_id: "b",
      labels: ["rel"],
    })
  })
})

describe("toLabelStudioResults (relations)", () => {
  it("emits Label Studio's top-level relation shape", () => {
    const annotations = [
      {
        id: "rel1",
        name: "rel",
        meta: {
          kind: "result",
          fromName: "rel",
          toName: "",
          resultType: "relation",
          value: relationValue("r1", "r2"),
        },
      },
    ] as unknown as Parameters<typeof toLabelStudioResults>[0]
    expect(toLabelStudioResults(annotations)).toEqual([
      { type: "relation", from_id: "r1", to_id: "r2", labels: [] },
    ])
  })
})
