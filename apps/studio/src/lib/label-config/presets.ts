import type { DataKind } from "@/lib/labeling-templates"

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
]

export const DEFAULT_CONFIG = imageDetectionReview
