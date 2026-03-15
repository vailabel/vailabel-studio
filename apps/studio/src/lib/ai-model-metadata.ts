import type { AIModel, AIModelMetadata } from "@/types/core"

type ModelMetadataContainer = {
  modelMetadata?: AIModelMetadata | null
}

export function getAIModelMetadata(
  model?: ModelMetadataContainer | null
): AIModelMetadata {
  return model?.modelMetadata || {}
}

export function getModelClassCount(model?: ModelMetadataContainer | null): number {
  const metadata = getAIModelMetadata(model)
  if (typeof metadata.classCount === "number") {
    return metadata.classCount
  }
  return metadata.classNames?.length || 0
}

export function isModelPredictionReady(model?: ModelMetadataContainer | null): boolean {
  return getAIModelMetadata(model).supportsPrediction === true
}

export function getModelUnsupportedReason(
  model?: ModelMetadataContainer | null
): string {
  const metadata = getAIModelMetadata(model)
  return metadata.unsupportedReason || ""
}

export function getPredictionReadinessLabel(model?: AIModel | null): string {
  return isModelPredictionReady(model) ? "Ready" : "Unsupported"
}
