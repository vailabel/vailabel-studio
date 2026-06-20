// Two-axis project taxonomy + the typed payload that lets one annotation model
// span every modality. A project is described by a coarse data `Modality`
// (what the items are) and a `Task` (what you do to them). Spatial geometry for
// image/video shapes stays in `Annotation.coordinates`; everything non-spatial
// (text char offsets, audio time ranges, segmentation masks, video frame refs)
// rides the typed `AnnotationMeta` discriminated union, stored verbatim in the
// nullable `annotations.meta_json` column. This keeps the storage layer additive
// (no per-modality tables) while giving the UI compile-time shape safety.

export type Modality =
  | "image"
  | "video"
  | "text"
  | "audio"
  | "tabular"
  | "custom"

export type Task =
  // image / video
  | "classification"
  | "detection"
  | "segmentation"
  | "keypoints"
  | "tracking"
  // text
  | "ner"
  | "text_classification"
  | "taxonomy"
  | "relation_extraction"
  | "question_answering"
  | "translation"
  // audio
  | "transcription"
  | "audio_classification"
  | "diarization"

/** Non-spatial payload carried by an annotation, discriminated by `kind`. */
export type AnnotationMeta =
  /** Pure image shape — geometry lives in `coordinates`; usually `meta` is absent. */
  | { kind: "spatial" }
  /** Segmentation mask in COCO run-length encoding (preserves import fidelity). */
  | { kind: "mask"; rle: { width: number; height: number; counts: number[] } }
  /** Text span (NER / document labeling), addressed by character offsets. */
  | { kind: "text"; charStart: number; charEnd: number; quote?: string }
  /** Directed relation between two annotations (relation extraction). */
  | { kind: "relation"; fromId: string; toId: string }
  /** Free-text output (translation, generated response, caption). */
  | { kind: "value"; text: string }
  /** Audio segment, addressed by a time range in seconds; `text` carries a
   *  transcript (ASR) when present. */
  | { kind: "audio"; tStart: number; tEnd: number; channel?: number; text?: string }
  /** Video annotation pinned to a frame (and optionally a track). */
  | { kind: "video"; frame: number; trackId?: string }
  /** A config-driven (Label Studio-style) result: one region/value produced by a
   *  control tag, bound to an object tag. `value` holds the type-specific payload
   *  (e.g. {choices}, {text}, {start,end,labels}, {x,y,width,height,...}). */
  | {
      kind: "result"
      fromName: string
      toName: string
      resultType: string
      value: Record<string, unknown>
    }

/**
 * A typed draft a modality editor body emits when the user creates an
 * annotation. The shell stamps the active class's label id + color onto it and
 * splits it into `coordinates` (spatial) + `meta` (everything else) before save.
 */
export type AnnotationTarget =
  | { kind: "spatial"; type: string; coordinates: Array<{ x: number; y: number }> }
  | { kind: "mask"; rle: { width: number; height: number; counts: number[] } }
  | { kind: "text"; charStart: number; charEnd: number; quote?: string }
  | { kind: "audio"; tStart: number; tEnd: number; channel?: number }

/**
 * Read-time shim: map a legacy single-axis annotation `type` string onto a
 * meta `kind`, for rows written before typed `meta` existed.
 */
export function legacyTypeToKind(type: string): AnnotationMeta["kind"] {
  switch (type) {
    case "mask":
      return "mask"
    case "span":
      return "text"
    case "segment":
      return "audio"
    default:
      return "spatial"
  }
}

/** Human-facing label for a modality, used in pickers and breadcrumbs. */
export const MODALITY_LABELS: Record<Modality, string> = {
  image: "Image",
  video: "Video",
  text: "Text",
  audio: "Audio",
  tabular: "Tabular",
  custom: "Custom",
}
