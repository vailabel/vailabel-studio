import type { AIModel } from "@/types/core"

/** The fields we sniff to recognize a SAM install. A loose shape so callers can
 *  pass a full {@link AIModel} or a lightweight stand-in (e.g. in tests). */
type SamModelLike = Pick<
  AIModel,
  "name" | "family" | "taskType" | "category" | "modelVersion" | "modelPath"
>

/**
 * Whether an installed model is a Segment Anything (SAM / MobileSAM / SAM 2)
 * model usable for click/box-to-segment. Mirrors the backend's `is_sam`
 * heuristic (`registry_id_for_model` in `domain/ai/service.rs`): SAM files and
 * names don't always literally contain "sam", so we also accept the
 * "segment anything" wording and the encoder filename. The plain "segmentation"
 * category (YOLO-seg, YOLOE) intentionally does NOT match — only true SAM does.
 */
export function isSamModel(model: SamModelLike): boolean {
  const haystack = [
    model.name,
    model.family,
    model.taskType,
    model.category,
    model.modelVersion,
    model.modelPath,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return (
    haystack.includes("sam") ||
    haystack.includes("segment anything") ||
    haystack.includes("segment_anything")
  )
}

/** First installed SAM model from a list, or `null` when none is installed. */
export function findSamModel<T extends SamModelLike>(models: T[]): T | null {
  return models.find((model) => isSamModel(model)) ?? null
}
