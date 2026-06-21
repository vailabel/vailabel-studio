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
}

/** Object tags that carry textual content (rendered as read-only panels by the
 *  config-driven editor). */
export const TEXTUAL_OBJECT_TAGS = new Set(["text", "hypertext", "paragraphs"])

/**
 * A "judge the text(s)" task: two or more textual data fields (`$`-bound) scored
 * only by whole-item controls (choices / rating / textarea / pairwise — no
 * span/region/relation labeling). These are inherently one-row-per-task (a
 * prompt plus one or more model outputs), so they import as spreadsheet rows and
 * render in the config-driven editor. This is what makes the Generative-AI
 * templates (RLHF, LLM grading, side-by-side, RAG eval) work end-to-end.
 */
export function isMultiTextJudgement(config: LabelConfig): boolean {
  const textFields = config.objects.filter(
    (o) => o.value.startsWith("$") && TEXTUAL_OBJECT_TAGS.has(o.tag)
  )
  if (textFields.length < 2) return false
  // A non-textual data object (image/audio/video) means the normal per-modality
  // inference should win instead.
  const hasMediaData = config.objects.some(
    (o) => o.value.startsWith("$") && !TEXTUAL_OBJECT_TAGS.has(o.tag)
  )
  if (hasMediaData) return false
  return config.controls.every(
    (c) => !isSpatialControl(c) && c.tag !== "relations"
  )
}

export function inferModalityTask(config: LabelConfig): {
  modality: Modality
  task?: Task
} {
  const primary = config.objects.find((o) => OBJECT_MODALITY[o.tag])
  if (!primary) return { modality: "custom" }
  // Multi-field LLM-evaluation configs (prompt + responses) route to the
  // config-driven editor regardless of which control they use.
  if (isMultiTextJudgement(config)) return { modality: "custom" }
  const base = OBJECT_MODALITY[primary.tag]

  const tags = config.controls.map((c) => c.tag)
  const only = (t: string) => tags.length === 1 && tags[0] === t
  const has = (t: string) => tags.includes(t)

  if (base === "image") {
    if (only("rectanglelabels")) return { modality: "image", task: "detection" }
    if (only("polygonlabels") || only("brushlabels"))
      return { modality: "image", task: "segmentation" }
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
    // Video projects run in the studio's video editor (FFmpeg pipeline).
    return { modality: "video", task: "tracking" }
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
