import type { DataKind } from "@/shared/lib/label-config/labeling-templates"

// Starter labeling configs (native JSON form). A custom project picks one (or
// writes its own); `dataKind` tells the create flow which files to import for
// the primary object. The config is the authored source of truth, stored on the
// project and parsed by `parseLabelConfig` (which also accepts Label Studio XML
// for import).
export interface ConfigPreset {
  id: string
  label: string
  description: string
  dataKind: DataKind
  config: string
}

// Authored as pretty JSON strings so the create flow can show/edit them directly.
const imageDetectionReview = `{
  "objects": [
    { "tag": "image", "name": "image", "value": "$image" }
  ],
  "controls": [
    { "tag": "rectanglelabels", "name": "box", "toName": "image",
      "choices": [
        { "value": "Object", "background": "#f97316" },
        { "value": "Person", "background": "#2563eb" }
      ] },
    { "tag": "choices", "name": "quality", "toName": "image",
      "labels": ["clear", "blurry"] },
    { "tag": "textarea", "name": "notes", "toName": "image" }
  ]
}`

const textNerSentiment = `{
  "objects": [
    { "tag": "text", "name": "text", "value": "$text" }
  ],
  "controls": [
    { "tag": "labels", "name": "entities", "toName": "text",
      "choices": [
        { "value": "PER", "background": "#ef4444" },
        { "value": "ORG", "background": "#10b981" },
        { "value": "LOC", "background": "#6366f1" }
      ] },
    { "tag": "choices", "name": "sentiment", "toName": "text",
      "labels": ["positive", "neutral", "negative"] },
    { "tag": "textarea", "name": "notes", "toName": "text" }
  ]
}`

const textRating = `{
  "objects": [
    { "tag": "text", "name": "text", "value": "$text" }
  ],
  "controls": [
    { "tag": "rating", "name": "rating", "toName": "text", "attrs": { "maxRating": "5" } },
    { "tag": "choices", "name": "verdict", "toName": "text",
      "labels": ["accept", "revise", "reject"] },
    { "tag": "textarea", "name": "feedback", "toName": "text" }
  ]
}`

const imageCaption = `{
  "objects": [
    { "tag": "image", "name": "image", "value": "$image" }
  ],
  "controls": [
    { "tag": "textarea", "name": "caption", "toName": "image" },
    { "tag": "taxonomy", "name": "tags", "toName": "image",
      "labels": ["indoor", "outdoor", "people"] }
  ]
}`

// Generative-AI presets. Multi-field tasks imported from a spreadsheet: each row
// is one task and its columns map to the object field names below.
const llmPreference = `{
  "objects": [
    { "tag": "text", "name": "prompt", "value": "$prompt", "attrs": { "title": "Prompt" } },
    { "tag": "text", "name": "response_a", "value": "$response_a", "attrs": { "title": "Response A" } },
    { "tag": "text", "name": "response_b", "value": "$response_b", "attrs": { "title": "Response B" } }
  ],
  "controls": [
    { "tag": "pairwise", "name": "preference", "toName": "response_a",
      "toNames": ["response_a", "response_b"],
      "attrs": { "title": "Which response is better?" } },
    { "tag": "textarea", "name": "rationale", "toName": "prompt", "attrs": { "title": "Rationale" } }
  ]
}`

const llmGrading = `{
  "objects": [
    { "tag": "text", "name": "prompt", "value": "$prompt", "attrs": { "title": "Prompt" } },
    { "tag": "text", "name": "response", "value": "$response", "attrs": { "title": "Model response" } }
  ],
  "controls": [
    { "tag": "rating", "name": "quality", "toName": "response",
      "attrs": { "title": "Overall quality", "maxRating": "5" } },
    { "tag": "choices", "name": "verdict", "toName": "response",
      "choices": [
        { "value": "Correct", "background": "#10b981" },
        { "value": "Partially correct", "background": "#f59e0b" },
        { "value": "Incorrect", "background": "#ef4444" }
      ],
      "attrs": { "title": "Verdict", "choice": "single" } },
    { "tag": "textarea", "name": "feedback", "toName": "response", "attrs": { "title": "Feedback" } }
  ]
}`

export const CONFIG_PRESETS: ConfigPreset[] = [
  {
    id: "image-detection-review",
    label: "Image: boxes + class + notes",
    description: "Bounding boxes, an image-level class, and a free-text note.",
    dataKind: "image",
    config: imageDetectionReview,
  },
  {
    id: "text-ner-sentiment",
    label: "Text: entities + sentiment + notes",
    description: "Span entities, a document sentiment, and a free-text note.",
    dataKind: "text",
    config: textNerSentiment,
  },
  {
    id: "text-rating",
    label: "Text: rating + class + feedback",
    description: "Rate a passage, tag it, and leave feedback (review / RLHF).",
    dataKind: "text",
    config: textRating,
  },
  {
    id: "image-caption",
    label: "Image: caption + tags",
    description: "Write a caption and apply multiple tags to each image.",
    dataKind: "image",
    config: imageCaption,
  },
  {
    id: "llm-preference",
    label: "LLM: A/B preference (RLHF)",
    description: "Prompt + two responses; pick the better one with a rationale.",
    dataKind: "multimodal",
    config: llmPreference,
  },
  {
    id: "llm-grading",
    label: "LLM: response grading",
    description: "Prompt + response; rate quality, give a verdict and feedback.",
    dataKind: "multimodal",
    config: llmGrading,
  },
]

export const DEFAULT_CONFIG = imageDetectionReview
