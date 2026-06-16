// A parsed, normalized labeling configuration (Label Studio-style). The config
// is two lists: object tags (what data is shown) and control tags (how it's
// labeled), bound by `toName` → object `name`. The renderer reads this; the
// parser produces it from XML or JSON.

export interface ConfigChoice {
  value: string
  background?: string
  alias?: string
  hotkey?: string
}

/** A data source shown to the annotator (Image, Text, Audio, …). */
export interface ObjectTag {
  /** Lowercased tag name, e.g. "image" | "text" | "audio" | "hypertext". */
  tag: string
  name: string
  /** Raw value attribute, e.g. "$image". */
  value: string
  /** Field key resolved against the item (value without the leading "$"). */
  valueKey: string
  attrs: Record<string, string>
}

/** A labeling control (Labels, RectangleLabels, Choices, TextArea, …). */
export interface ControlTag {
  /** Lowercased tag name; also the Label Studio result `type`. */
  tag: string
  name: string
  /** First bound object name (Label Studio allows a comma list). */
  toName: string
  toNames: string[]
  /** Options for label/choice controls (from nested <Label>/<Choice>). */
  choices: ConfigChoice[]
  attrs: Record<string, string>
}

export interface LabelConfig {
  objects: ObjectTag[]
  controls: ControlTag[]
}

/** Object tags supported by the parser/renderer. */
export const OBJECT_TAGS = new Set([
  "image",
  "text",
  "audio",
  "hypertext",
  "paragraphs",
  "timeseries",
  "table",
  "list",
  "video",
  "pdf",
  "chat",
])

/** Control tags recognized by the parser. */
export const CONTROL_TAGS = new Set([
  "labels",
  "hypertextlabels",
  "paragraphlabels",
  "timeserieslabels",
  "rectanglelabels",
  "polygonlabels",
  "ellipselabels",
  "keypointlabels",
  "brushlabels",
  "choices",
  "taxonomy",
  "rating",
  "textarea",
  "number",
  "datetime",
  "relations",
  "ranker",
  "pairwise",
])

/** Find an object tag by name (controls reference it via toName). */
export function objectByName(
  config: LabelConfig,
  name: string
): ObjectTag | undefined {
  return config.objects.find((object) => object.name === name)
}
