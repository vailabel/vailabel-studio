import type { AIModel } from "@/types/core"
import {
  canAttemptModelPrediction,
  getPredictionReadinessLabel,
  isModelPredictionReady,
  willModelConvertOnRun,
} from "@/lib/ai-model-metadata"

describe("ai model metadata helpers", () => {
  it("keeps ONNX models with prediction support marked as ready", () => {
    const model = {
      category: "detection",
      modelPath: "C:/models/yolo26n.onnx",
      modelMetadata: {
        supportsPrediction: true,
      },
    } as AIModel

    expect(isModelPredictionReady(model)).toBe(true)
    expect(canAttemptModelPrediction(model)).toBe(true)
    expect(willModelConvertOnRun(model)).toBe(false)
    expect(getPredictionReadinessLabel(model)).toBe("Ready")
  })

  it("allows detection checkpoints to run by converting them on demand", () => {
    const model = {
      category: "detection",
      modelPath: "C:/models/yolo26n.pt",
      modelMetadata: {
        supportsPrediction: false,
        unsupportedReason:
          "AI detect currently requires an ONNX model file. This model was imported with a .pt checkpoint.",
      },
    } as AIModel

    expect(isModelPredictionReady(model)).toBe(false)
    expect(willModelConvertOnRun(model)).toBe(true)
    expect(canAttemptModelPrediction(model)).toBe(true)
    expect(getPredictionReadinessLabel(model)).toBe("Converts on Run")
  })

  it("keeps non-detection checkpoints unsupported", () => {
    const model = {
      category: "segmentation",
      modelPath: "C:/models/yolo26n-seg.pt",
      modelMetadata: {
        supportsPrediction: false,
      },
    } as AIModel

    expect(willModelConvertOnRun(model)).toBe(false)
    expect(canAttemptModelPrediction(model)).toBe(false)
    expect(getPredictionReadinessLabel(model)).toBe("Unsupported")
  })
})
