import type { AIModel, AIModelMetadata } from "@/types/core"

type ModelMetadataContainer = {
  modelMetadata?: AIModelMetadata | null
  modelPath?: string | null
  model_path?: string | null
  category?: string | null
}

export function getAIModelMetadata(
  model?: ModelMetadataContainer | null
): AIModelMetadata {
  return model?.modelMetadata || {}
}

function getModelPath(model?: ModelMetadataContainer | null): string {
  return model?.modelPath || model?.model_path || ""
}

function isDetectionModel(model?: ModelMetadataContainer | null): boolean {
  const category = model?.category?.trim().toLowerCase()
  return !category || category === "detection"
}

function isPyTorchCheckpointPath(modelPath: string): boolean {
  const normalizedPath = modelPath.trim().toLowerCase()
  return normalizedPath.endsWith(".pt") || normalizedPath.endsWith(".pth")
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

export function willModelConvertOnRun(
  model?: ModelMetadataContainer | null
): boolean {
  if (isModelPredictionReady(model)) {
    return false
  }

  return (
    isDetectionModel(model) &&
    isPyTorchCheckpointPath(getModelPath(model))
  )
}

export function canAttemptModelPrediction(
  model?: ModelMetadataContainer | null
): boolean {
  return isModelPredictionReady(model) || willModelConvertOnRun(model)
}

export function getModelUnsupportedReason(
  model?: ModelMetadataContainer | null
): string {
  const metadata = getAIModelMetadata(model)
  return metadata.unsupportedReason || ""
}

export function getPredictionReadinessLabel(model?: AIModel | null): string {
  if (isModelPredictionReady(model)) {
    return "Ready"
  }

  if (willModelConvertOnRun(model)) {
    return "Converts on Run"
  }

  return "Unsupported"
}
