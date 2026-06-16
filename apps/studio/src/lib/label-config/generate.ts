import type { LabelingTemplate } from "@/lib/labeling-templates"
import type {
  ConfigChoice,
  ControlTag,
  LabelConfig,
  ObjectTag,
} from "./types"
import { parseLabelConfig } from "./parse"
import { LS_TEMPLATES } from "./ls-gallery"

// Authentic Label Studio configs (converted to our JSON), keyed by template id.
const LS_CONFIG_BY_ID = new Map(LS_TEMPLATES.map((t) => [t.id, t.config]))

// Generate a starter labeling config for a template, derive label classes from a
// config, and serialize an edited config back to the native JSON form. The
// config is the single source of truth (Label Studio style): the create flow
// stores it, the Visual/Code editors read & write it, and at create time the
// label classes are extracted from it.

// Fallback palette (mirrors editors/custom/config-helpers so derived classes get
// the same colors the renderer would pick).
const PALETTE = [
  "#ef4444",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#84cc16",
]

/** Controls whose choices define label classes (regions + whole-item choices). */
export const LABEL_BEARING_TAGS = new Set([
  "rectanglelabels",
  "polygonlabels",
  "keypointlabels",
  "ellipselabels",
  "brushlabels",
  "labels",
  "hypertextlabels",
  "paragraphlabels",
  "timeserieslabels",
  "choices",
  "taxonomy",
])

export function isLabelBearing(control: ControlTag): boolean {
  return LABEL_BEARING_TAGS.has(control.tag)
}

// ── builders ────────────────────────────────────────────────────────────────
function obj(tag: string): ObjectTag {
  return { tag, name: tag, value: `$${tag}`, valueKey: tag, attrs: {} }
}

function ctrl(
  tag: string,
  name: string,
  toName: string,
  choices: ConfigChoice[] = [],
  attrs: Record<string, string> = {}
): ControlTag {
  return { tag, name, toName, toNames: [toName], choices, attrs }
}

function ch(value: string, background?: string): ConfigChoice {
  return background ? { value, background } : { value }
}

// Per-template configs for combined-control tasks that the config-driven editor
// renders (an object + standalone controls), keyed by template id. Used for
// templates whose modality is "custom".
const CONFIG_BY_ID: Record<string, () => LabelConfig> = {
  "image-captioning": () => ({
    objects: [obj("image")],
    controls: [ctrl("textarea", "caption", "image")],
  }),
  "visual-qa": () => ({
    objects: [obj("image")],
    controls: [ctrl("textarea", "answer", "image")],
  }),
  "response-generation": () => ({
    objects: [obj("text")],
    controls: [ctrl("textarea", "response", "text")],
  }),
  "text-summarization": () => ({
    objects: [obj("text")],
    controls: [ctrl("textarea", "summary", "text")],
  }),
  "intent-slot": () => ({
    objects: [obj("text")],
    controls: [
      ctrl(
        "choices",
        "intent",
        "text",
        [ch("Booking"), ch("Cancellation"), ch("Question")],
        { choice: "single" }
      ),
      ctrl("labels", "slot", "text", [
        ch("Date", "#10b981"),
        ch("Location", "#6366f1"),
      ]),
    ],
  }),
}

// ── template → config ─────────────────────────────────────────────────────────
/** Build a starter labeling config matching a template's (modality, task). */
export function configForTemplate(template: LabelingTemplate): LabelConfig {
  // Prefer the authentic Label Studio config when we imported one for this id.
  const lsConfig = LS_CONFIG_BY_ID.get(template.id)
  if (lsConfig) {
    try {
      return parseLabelConfig(lsConfig)
    } catch {
      // fall through to the built-in starter
    }
  }

  const byId = CONFIG_BY_ID[template.id]
  if (byId) return byId()

  const modality = template.modality ?? "image"
  const task = template.task

  if (modality === "text") return textConfig(task)
  if (modality === "audio") return audioConfig(task)
  if (modality === "video") return videoConfig(task)
  if (modality === "custom") return customConfig()
  return imageConfig(task)
}

function videoConfig(task?: string): LabelConfig {
  const video = obj("video")
  if (task === "classification") {
    return {
      objects: [video],
      controls: [
        ctrl("choices", "class", "video", [
          ch("Clip A", "#10b981"),
          ch("Clip B", "#6366f1"),
        ]),
      ],
    }
  }
  // tracking / timeline: boxes tracked across frames in the video editor
  return {
    objects: [video],
    controls: [
      ctrl("rectanglelabels", "label", "video", [
        ch("Object", "#f97316"),
        ch("Person", "#2563eb"),
      ]),
    ],
  }
}

function imageConfig(task?: string): LabelConfig {
  const image = obj("image")
  switch (task) {
    case "classification":
      return {
        objects: [image],
        controls: [
          ctrl(
            "choices",
            "class",
            "image",
            [ch("Positive", "#10b981"), ch("Negative", "#ef4444")],
            { choice: "single" }
          ),
        ],
      }
    case "segmentation":
      return {
        objects: [image],
        controls: [
          ctrl("polygonlabels", "label", "image", [
            ch("Object", "#f97316"),
            ch("Background", "#64748b"),
          ]),
        ],
      }
    case "keypoints":
      return {
        objects: [image],
        controls: [
          ctrl("keypointlabels", "label", "image", [ch("Point", "#6366f1")]),
        ],
      }
    default: // detection / tracking / mixed
      return {
        objects: [image],
        controls: [
          ctrl("rectanglelabels", "label", "image", [
            ch("Object", "#f97316"),
            ch("Person", "#2563eb"),
          ]),
        ],
      }
  }
}

function textConfig(task?: string): LabelConfig {
  const text = obj("text")
  switch (task) {
    case "text_classification":
      return {
        objects: [text],
        controls: [
          ctrl(
            "choices",
            "class",
            "text",
            [
              ch("Positive", "#10b981"),
              ch("Neutral", "#6366f1"),
              ch("Negative", "#ef4444"),
            ],
            { choice: "single" }
          ),
        ],
      }
    case "taxonomy":
      return {
        objects: [text],
        controls: [
          ctrl("taxonomy", "tags", "text", [ch("Topic A"), ch("Topic B")]),
        ],
      }
    case "relation_extraction":
      return {
        objects: [text],
        controls: [
          ctrl("labels", "label", "text", [
            ch("PER", "#ef4444"),
            ch("ORG", "#10b981"),
          ]),
          ctrl("relations", "relation", "text"),
        ],
      }
    case "question_answering":
      return {
        objects: [text],
        controls: [ctrl("labels", "answer", "text", [ch("Answer", "#6366f1")])],
      }
    case "translation":
      return {
        objects: [text],
        controls: [ctrl("textarea", "translation", "text")],
      }
    default: // ner
      return {
        objects: [text],
        controls: [
          ctrl("labels", "label", "text", [
            ch("PER", "#ef4444"),
            ch("ORG", "#10b981"),
            ch("LOC", "#6366f1"),
          ]),
        ],
      }
  }
}

function audioConfig(task?: string): LabelConfig {
  const audio = obj("audio")
  switch (task) {
    case "transcription":
      return {
        objects: [audio],
        controls: [ctrl("textarea", "transcription", "audio")],
      }
    case "diarization":
      return {
        objects: [audio],
        controls: [
          ctrl("labels", "speaker", "audio", [
            ch("Speaker 1", "#6366f1"),
            ch("Speaker 2", "#f59e0b"),
          ]),
        ],
      }
    default: // audio_classification
      return {
        objects: [audio],
        controls: [
          ctrl("labels", "label", "audio", [
            ch("Speech", "#10b981"),
            ch("Music", "#6366f1"),
            ch("Noise", "#f59e0b"),
          ]),
        ],
      }
  }
}

function customConfig(): LabelConfig {
  const image = obj("image")
  return {
    objects: [image],
    controls: [
      ctrl("rectanglelabels", "box", "image", [
        ch("Object", "#f97316"),
        ch("Person", "#2563eb"),
      ]),
      ctrl("choices", "quality", "image", [ch("clear"), ch("blurry")], {
        choice: "single",
      }),
      ctrl("textarea", "notes", "image"),
    ],
  }
}

// ── serialize (config → JSON string) ──────────────────────────────────────────
/** Serialize a config to the pretty native JSON form the parser round-trips. */
export function serializeConfig(config: LabelConfig): string {
  const objects = config.objects.map((object) => ({
    tag: object.tag,
    name: object.name,
    value: object.value,
    ...(hasKeys(object.attrs) ? { attrs: object.attrs } : {}),
  }))
  const controls = config.controls.map((control) => ({
    tag: control.tag,
    name: control.name,
    toName: control.toName,
    ...(control.choices.length ? { choices: control.choices } : {}),
    ...(hasKeys(control.attrs) ? { attrs: control.attrs } : {}),
  }))
  return JSON.stringify({ objects, controls }, null, 2)
}

function hasKeys(record?: Record<string, string>): boolean {
  return !!record && Object.keys(record).length > 0
}

/** Convenience: a template's starter config as a JSON string. */
export function configStringForTemplate(template: LabelingTemplate): string {
  return serializeConfig(configForTemplate(template))
}

// ── config → label classes ────────────────────────────────────────────────────
/** Derive the project's label classes (name + color) from a config's controls. */
export function extractClasses(
  config: LabelConfig
): { name: string; color: string }[] {
  const out: { name: string; color: string }[] = []
  const seen = new Set<string>()
  let paletteIndex = 0
  for (const control of config.controls) {
    if (!isLabelBearing(control)) continue
    for (const choice of control.choices) {
      const name = choice.value?.trim()
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      out.push({
        name,
        color: choice.background || PALETTE[paletteIndex % PALETTE.length],
      })
      paletteIndex++
    }
  }
  return out
}
