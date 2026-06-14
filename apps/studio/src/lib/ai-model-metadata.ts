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

export type ModelRole =
  | "detection"
  | "segmentation"
  | "pose"
  | "classification"
  | "other"

/** Ultralytics-style filename suffixes are authoritative about a model's task —
 *  a `-cls`/`-seg`/`-pose` export is that task even if it was installed under the
 *  wrong category (e.g. a `-cls` asset picked under a "Detection" catalog entry). */
function taskFromPath(modelPath: string): ModelRole | null {
  const name = modelPath.trim().toLowerCase()
  if (name.includes("-cls") || name.includes("_cls")) return "classification"
  if (name.includes("-pose") || name.includes("_pose")) return "pose"
  if (name.includes("-seg") || name.includes("_seg")) return "segmentation"
  return null
}

/** The model's task role, derived from its filename suffix first (authoritative),
 *  then its category. SAM ("segment_anything…") resolves via category. */
export function getModelRole(model?: ModelMetadataContainer | null): ModelRole {
  const fromPath = taskFromPath(getModelPath(model))
  if (fromPath) return fromPath
  const category = model?.category?.trim().toLowerCase()
  if (!category || category === "detection") return "detection"
  if (category === "segmentation") return "segmentation"
  if (category === "pose") return "pose"
  if (category === "classification") return "classification"
  return "other"
}

export function isDetectionModel(model?: ModelMetadataContainer | null): boolean {
  return getModelRole(model) === "detection"
}

export function isSegmentationModel(
  model?: ModelMetadataContainer | null
): boolean {
  return getModelRole(model) === "segmentation"
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

  switch (getModelRole(model)) {
    case "segmentation":
      return "Segmentation"
    case "classification":
      return "Classification"
    case "pose":
      return "Pose"
    default:
      return "Unsupported"
  }
}

/** A model is "usable" (not a dead end) if it can run AI detect OR has a real
 *  role of its own (segmentation models drive the copilot). Drives the positive
 *  vs. muted badge styling. */
export function isModelUsable(model?: AIModel | null): boolean {
  return canAttemptModelPrediction(model) || isSegmentationModel(model)
}

/** Accurate, role-aware tooltip for the prediction badge. Overrides any stale
 *  stored `unsupportedReason` (older installs of SAM say "not wired up yet"). */
export function getModelUsageHint(model?: AIModel | null): string {
  if (isModelPredictionReady(model)) {
    return "Ready for AI detect."
  }
  if (willModelConvertOnRun(model)) {
    return "Converts to ONNX on first AI detect run."
  }
  switch (getModelRole(model)) {
    case "segmentation":
      return "Segmentation model — used by the AI Copilot for click/box → polygon (ask it to “outline them”), not the Detect button."
    case "classification":
      return "Classification model — it labels the whole image, not regions. Install a detection model (e.g. YOLO26 Detection) to draw boxes."
    case "pose":
      return "Pose-estimation model — not a box detector. Install a detection model for AI detect."
    default:
      return getModelUnsupportedReason(model) || "Not usable for AI detect."
  }
}
