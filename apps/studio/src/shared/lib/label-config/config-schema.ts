// JSON Schema (draft-07) for the native JSON labeling config consumed by
// parseLabelConfig. Surfaces as autocomplete / hover docs / inline lint in the
// config code editor (json-config-editor.tsx).
// Keep the tag enums in sync with OBJECT_TAGS / CONTROL_TAGS in ./types.ts.
export const LABEL_CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "VaiLabel Native Labeling Config",
  description:
    "Native JSON labeling configuration consumed by parseLabelConfig. A config is two lists: object tags (the data shown to the annotator) and control tags (how it's labeled). Controls bind to objects via toName -> object name. This is the JSON alternative to Label Studio XML; the parser accepts either.",
  type: "object",
  additionalProperties: true,
  properties: {
    objects: {
      type: "array",
      description:
        "Data sources shown to the annotator (Image, Text, Audio, ...). Each entry declares what gets rendered and which item field it reads.",
      items: {
        type: "object",
        additionalProperties: true,
        required: ["tag", "name", "value"],
        properties: {
          tag: {
            type: "string",
            description:
              "Object tag type (case-insensitive; lowercased by the parser). Determines how the data is rendered.",
            enum: [
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
            ],
          },
          name: {
            type: "string",
            description:
              "Unique identifier for this object. Controls reference it via their toName/toNames.",
          },
          value: {
            type: "string",
            description:
              'Source field reference, e.g. "$image". The leading "$" is stripped to derive the item field key (valueKey) read from each data item.',
          },
          attrs: {
            type: "object",
            description:
              "Extra rendering attributes for this object (keys are lowercased by the parser). Tag-specific, e.g. image zoom or text granularity options.",
            additionalProperties: { type: "string" },
          },
        },
      },
    },
    controls: {
      type: "array",
      description:
        "Labeling controls (Labels, RectangleLabels, Choices, TextArea, ...). Each produces results bound to one or more objects.",
      items: {
        type: "object",
        additionalProperties: true,
        required: ["tag", "name", "toName"],
        properties: {
          tag: {
            type: "string",
            description:
              "Control tag type (case-insensitive; lowercased by the parser). Also used as the result `type`. Determines the labeling UI and output shape.",
            enum: [
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
            ],
          },
          name: {
            type: "string",
            description:
              "Unique identifier for this control (becomes fromName on emitted results).",
          },
          toName: {
            type: "string",
            description:
              "Name of the object this control binds to. May be a single name or a comma-separated list (first entry becomes the primary toName; the full list is split into toNames). Ignored if toNames is provided.",
          },
          toNames: {
            type: "array",
            description:
              "Explicit list of bound object names. Takes precedence over toName when present; the first entry becomes the primary toName.",
            items: { type: "string" },
          },
          choices: {
            type: "array",
            description:
              "Options for label/choice controls. Each item may be an object {value,...} or a bare string (shorthand for {value}). Use this OR the `labels` shorthand.",
            items: {
              oneOf: [
                {
                  type: "string",
                  description:
                    'Shorthand for a choice: equivalent to { "value": <string> }.',
                },
                {
                  type: "object",
                  additionalProperties: true,
                  required: ["value"],
                  properties: {
                    value: {
                      type: "string",
                      description:
                        "The label/choice value (also its display text unless aliased).",
                    },
                    background: {
                      type: "string",
                      description:
                        'Optional CSS color for the label/region, e.g. "#f97316".',
                    },
                    alias: {
                      type: "string",
                      description:
                        "Optional alternate value stored in results instead of the displayed value.",
                    },
                    hotkey: {
                      type: "string",
                      description:
                        "Optional keyboard shortcut to select this choice.",
                    },
                  },
                },
              ],
            },
          },
          labels: {
            type: "array",
            description:
              "Shorthand list of choice values; each string is expanded to { value }. Used only when `choices` is absent.",
            items: { type: "string" },
          },
          attrs: {
            type: "object",
            description:
              'Extra control attributes (keys are lowercased by the parser). Tag-specific, e.g. { "maxRating": "5" } for rating or rows/required for textarea.',
            additionalProperties: { type: "string" },
          },
        },
      },
    },
  },
} as const
