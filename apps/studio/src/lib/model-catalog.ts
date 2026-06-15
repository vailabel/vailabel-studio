import type { AIModel } from "@/types/core"

/**
 * Capability-oriented model catalog. Unlike `SYSTEM_MODELS` (the installable
 * ONNX variants), this describes the *families* the app knows about, grouped by
 * domain and by the annotation capability/tool they power. It drives the
 * read-only "Model library" view.
 *
 * There is no single "active model": each tool uses the model that fits it (the
 * box tool runs a detector, the polygon/SAM tool segments, text tools run NLP),
 * and the copilot LLM routes between them. `availability` is honest about what
 * can actually run today — families without a local inference backend are
 * marked "planned" so nothing claims to work before it does.
 */
export type ModelDomain = "vision" | "nlp"
export type ModelAvailability = "available" | "planned"

export interface CatalogModelEntry {
  id: string
  name: string
  /** What the model is used for (shown as tags). */
  usedFor: string[]
  availability: ModelAvailability
  /** True when at least one model of this family is installed locally. Only set
   *  for `available` families. */
  isInstalled?: (models: AIModel[]) => boolean
}

export interface ModelCapability {
  id: string
  /** Capability shown as the card title, e.g. "Bounding boxes". */
  title: string
  /** The tool/flow that uses it, e.g. "Box tool · Auto-label". */
  tool: string
  description: string
  models: CatalogModelEntry[]
}

export interface ModelDomainGroup {
  domain: ModelDomain
  title: string
  description: string
  capabilities: ModelCapability[]
}

const familyInstalled = (needle: string) => (models: AIModel[]) =>
  models.some((model) => (model.family ?? "").toLowerCase().includes(needle))

export const MODEL_CATALOG: ModelDomainGroup[] = [
  {
    domain: "vision",
    title: "Computer Vision",
    description: "Models that label images — boxes, masks and polygons.",
    capabilities: [
      {
        id: "bbox",
        title: "Bounding boxes",
        tool: "Box tool · Auto-label",
        description: "Detect objects and place boxes automatically.",
        models: [
          {
            id: "yolo",
            name: "YOLO",
            usedFor: ["Auto-label bounding boxes", "Object detection"],
            availability: "available",
            isInstalled: familyInstalled("yolo"),
          },
          {
            id: "grounding-dino",
            name: "Grounding DINO",
            usedFor: ["Text-prompt object detection"],
            availability: "planned",
          },
        ],
      },
      {
        id: "segmentation",
        title: "Segmentation & polygons",
        tool: "Polygon tool · SAM click-to-segment",
        description: "Outline objects as masks or editable polygons.",
        models: [
          {
            id: "sam",
            name: "SAM",
            usedFor: ["Interactive segmentation", "Polygon generation"],
            availability: "available",
            isInstalled: familyInstalled("sam"),
          },
          {
            id: "detectron2",
            name: "Detectron2",
            usedFor: ["Detection", "Segmentation"],
            availability: "planned",
          },
        ],
      },
    ],
  },
  {
    domain: "nlp",
    title: "Natural Language (NLP)",
    description: "Models that label text and documents.",
    capabilities: [
      {
        id: "text",
        title: "Text & document labeling",
        tool: "Text tools · Copilot LLM",
        description:
          "Tag entities, classify and analyze text for document projects.",
        models: [
          {
            id: "bert",
            name: "BERT",
            usedFor: ["Named Entity Recognition", "Text classification"],
            availability: "planned",
          },
          {
            id: "roberta",
            name: "RoBERTa",
            usedFor: ["Sentiment analysis", "Text classification"],
            availability: "planned",
          },
          {
            id: "spacy",
            name: "spaCy",
            usedFor: ["Named Entity Recognition", "Document labeling"],
            availability: "planned",
          },
          {
            id: "hf-transformers",
            name: "Hugging Face Transformers",
            usedFor: [
              "Named Entity Recognition",
              "Text classification",
              "Sentiment analysis",
            ],
            availability: "planned",
          },
        ],
      },
    ],
  },
]

export const isCapabilityReady = (
  capability: ModelCapability,
  models: AIModel[]
) =>
  capability.models.some(
    (entry) => entry.availability === "available" && entry.isInstalled?.(models)
  )

export const totalCapabilities = MODEL_CATALOG.reduce(
  (count, group) => count + group.capabilities.length,
  0
)

export const countReadyCapabilities = (models: AIModel[]) =>
  MODEL_CATALOG.reduce(
    (count, group) =>
      count +
      group.capabilities.filter((capability) =>
        isCapabilityReady(capability, models)
      ).length,
    0
  )
