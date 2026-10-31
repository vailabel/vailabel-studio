import type { LabelConfig } from "./types"
import { isSpatialControl } from "./config-helpers"
import type { Modality, Task } from "@/shared/types/modality"

// Derive a project's (modality, task) from its labeling config — making the
// config the single source of truth for the create flow. A config whose object
// + controls match a specialized editor routes there (image canvas, text/audio
// editors); anything else (combined controls, free-text on image, unknown
// objects) routes to the config-driven "custom" editor.

const OBJECT_MODALITY: Record<string, Modality> = {
  image: "image",
  text: "text",
  audio: "audio",
  video: "video",
  table: "tabular",
  pointcloud: "pointcloud",
  dicom: "medical",
}

/** Object tags that carry textual content (rendered as read-only panels by the
 *  config-driven editor) — plain text, HTML, and the structured dialogue / chat
 *  / list fields. */
export const TEXTUAL_OBJECT_TAGS = new Set([
  "text",
  "hypertext",
  "paragraphs",
  "chat",
  "list",
])

/**
 * A "judge the fields" task: several data fields (`$`-bound) scored only by
 * whole-item controls (choices / rating / textarea / pairwise / ranker — no
 * span/region/relation labeling). Two shapes qualify:
 *
 * - two or more text fields and no media — a prompt plus model outputs (RLHF,
 *   LLM grading, RAG eval), or a query plus candidate documents (retrieval,
 *   search ranking);
 * - two or more images, optionally with text — image retrieval, multi-image
 *   classification.
 *
 * These are inherently one-row-per-task, so they import as spreadsheet rows
 * (each column a field) and render in the config-driven editor with every field
 * as a read-only panel. A single image with text beside it (visual QA) is NOT a
 * judgement: the image stays the interactive viewer.
 */
export function isMultiFieldJudgement(config: LabelConfig): boolean {
  if (config.controls.some((c) => isSpatialControl(c) || c.tag === "relations")) {
    return false
  }
  const fields = config.objects.filter((o) => o.value.startsWith("$"))
  const textual = fields.filter((o) => TEXTUAL_OBJECT_TAGS.has(o.tag))
  const images = fields.filter((o) => o.tag === "image")
  // Audio / video / PDF / time series are file-backed: per-modality rules win.
  if (textual.length + images.length !== fields.length) return false
  if (images.length >= 2) return true
  return images.length === 0 && textual.length >= 2
}

export function inferModalityTask(config: LabelConfig): {
  modality: Modality
  task?: Task
} {
  const primary = config.objects.find((o) => OBJECT_MODALITY[o.tag])
  if (!primary) return { modality: "custom" }
  // Multi-field judgement configs (prompt + responses, query + candidates,
  // several images) route to the config-driven editor whatever control they use.
  if (isMultiFieldJudgement(config)) return { modality: "custom" }
  const base = OBJECT_MODALITY[primary.tag]

  const tags = config.controls.map((c) => c.tag)
  const only = (t: string) => tags.length === 1 && tags[0] === t
  const has = (t: string) => tags.includes(t)

  if (base === "image") {
    if (only("rectanglelabels")) return { modality: "image", task: "detection" }
    if (only("polygonlabels")) return { modality: "image", task: "segmentation" }
    // Brush masks are raster regions, drawn by the config-driven editor (the
    // canvas's free-draw tool is vector-only).
    if (only("keypointlabels")) return { modality: "image", task: "keypoints" }
    if (only("choices")) return { modality: "image", task: "classification" }
    return { modality: "custom" }
  }

  if (base === "text") {
    if (has("labels") && has("relations"))
      return { modality: "text", task: "relation_extraction" }
    if (only("labels") || only("hypertextlabels"))
      return { modality: "text", task: "ner" }
    if (only("choices")) return { modality: "text", task: "text_classification" }
    if (only("taxonomy")) return { modality: "text", task: "taxonomy" }
    if (only("textarea")) return { modality: "text", task: "translation" }
    return { modality: "custom" }
  }

  if (base === "video") {
    // One box-tracking control is classic tracking: the studio's video editor
    // (FFmpeg pipeline, keyframe tracks). Anything else — clip classification,
    // timeline labels, tracks plus attributes — is rendered from the config.
    if (only("videorectangle") || only("rectanglelabels"))
      return { modality: "video", task: "tracking" }
    return { modality: "custom" }
  }

  if (base === "pointcloud") {
    // 3D boxes (cuboids) plus any whole-scene controls, in the point cloud editor.
    return { modality: "pointcloud", task: "detection_3d" }
  }

  if (base === "medical") {
    // DICOM series in the slice viewer; the task names what is drawn.
    if (has("brushlabels") || has("polygonlabels"))
      return { modality: "medical", task: "segmentation" }
    if (has("rectanglelabels") || has("keypointlabels") || has("ellipselabels"))
      return { modality: "medical", task: "detection" }
    return { modality: "medical", task: "classification" }
  }

  if (base === "tabular") {
    // Each row is one task; whole-row labeling via choices/labels/taxonomy.
    if (only("choices") || only("taxonomy") || only("labels"))
      return { modality: "tabular", task: "classification" }
    return { modality: "custom" }
  }

  // audio
  if (only("labels")) return { modality: "audio", task: "audio_classification" }
  if (only("textarea")) return { modality: "audio", task: "transcription" }
  return { modality: "custom" }
}
