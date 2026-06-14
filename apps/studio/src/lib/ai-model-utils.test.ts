import { findSamModel, isSamModel } from "./ai-model-utils"
import type { AIModel } from "@/types/core"

// Minimal installed-model stand-ins: only the fields isSamModel sniffs matter.
const model = (overrides: Partial<AIModel>): AIModel =>
  ({ name: "", modelPath: "", ...overrides }) as AIModel

describe("isSamModel", () => {
  it("matches the SAM ViT-B catalog install by name", () => {
    expect(
      isSamModel(
        model({
          name: "Segment Anything (SAM ViT-B)",
          category: "segmentation",
        })
      )
    ).toBe(true)
  })

  it("matches by the encoder filename even when the name lacks 'sam'", () => {
    expect(
      isSamModel(
        model({
          name: "ViT-B (quantized)",
          modelPath:
            "C:/models/catalog/abc/segment_anything_vit_b_encoder_quant.onnx",
        })
      )
    ).toBe(true)
  })

  it("matches MobileSAM and SAM 2 variants", () => {
    expect(isSamModel(model({ name: "MobileSAM" }))).toBe(true)
    expect(isSamModel(model({ name: "SAM 2 Hiera", family: "sam2" }))).toBe(true)
    expect(isSamModel(model({ name: "Detector", modelVersion: "SAM-ViT-B" }))).toBe(
      true
    )
  })

  it("does NOT match plain segmentation models (YOLO-seg, YOLOE)", () => {
    expect(
      isSamModel(
        model({
          name: "YOLO26 Segmentation",
          family: "yolo26",
          category: "segmentation",
          taskType: "segmentation",
        })
      )
    ).toBe(false)
    expect(
      isSamModel(
        model({
          name: "YOLOE-26 Open Vocabulary",
          family: "yoloe-26",
          category: "segmentation",
          taskType: "open_vocabulary_segmentation",
        })
      )
    ).toBe(false)
  })

  it("does NOT match detection models", () => {
    expect(
      isSamModel(
        model({ name: "YOLO26 Detection", family: "yolo26", category: "detection" })
      )
    ).toBe(false)
  })
})

describe("findSamModel", () => {
  it("returns the SAM model from a mixed installed list", () => {
    const models = [
      model({ name: "YOLO26 Detection", category: "detection" }),
      model({ name: "Segment Anything (SAM ViT-B)", category: "segmentation" }),
    ]
    expect(findSamModel(models)?.name).toBe("Segment Anything (SAM ViT-B)")
  })

  it("returns null when no SAM model is installed", () => {
    const models = [model({ name: "YOLO26 Detection", category: "detection" })]
    expect(findSamModel(models)).toBeNull()
  })
})
