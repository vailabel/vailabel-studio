import {
  SquareDashed,
  Shapes,
  Tags,
  Spline,
  Brush,
  ScanText,
  MessageSquareText,
  HelpCircle,
  Circle,
  PenTool,
  Clapperboard,
  Video,
  Film,
  Type,
  FileText,
  Languages,
  ListTree,
  Link2,
  AudioLines,
  Mic,
  Waves,
  MessagesSquare,
  ListOrdered,
  Search,
  Scale,
  Table,
  Code2,
  LineChart,
  Activity,
  Sparkles,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"
import type { Modality, Task } from "@/shared/types/modality"
import { LS_TEMPLATES } from "@/shared/lib/label-config/ls-gallery"

// Project types that map to a working editor today. Kept as string literals so
// this catalog stays decoupled from the create viewmodel (which also exports
// PROJECT_TYPES with the same values).
type WorkingProjectType =
  | "object_detection"
  | "segmentation"
  | "classification"
  | "image_annotation"
  | "text_annotation"
  | "audio_annotation"
  | "video_annotation"

export type TemplateStatus = "available" | "pending"

export type DataKind =
  | "image"
  | "video"
  | "text"
  | "audio"
  | "timeseries"
  | "html"
  | "ranking"
  | "multimodal"

export interface LabelingTemplate {
  id: string
  label: string
  description: string
  category: string
  dataKind: DataKind
  icon: LucideIcon
  /** Set only for templates whose editor is implemented (status "available"). */
  projectType?: WorkingProjectType
  /** Coarse data type the project is created with (image | text | …). */
  modality?: Modality
  /** Labeling task within the modality (ner | text_classification | …). */
  task?: Task
  /** Preview image (public path), e.g. "/templates/<id>.png". */
  image?: string
  status: TemplateStatus
}

// Mirrors the Label Studio template gallery. Only the image templates have a
// working editor today; everything else is declared as `pending` so the create
// screen shows the full roadmap without offering broken flows.
export const LABELING_TEMPLATES: LabelingTemplate[] = [
  // ── Custom ───────────────────────────────────────────────────────────────
  {
    id: "custom",
    label: "Custom labeling config",
    description: "Define your own objects + controls (JSON or Label Studio XML)",
    category: "Custom",
    dataKind: "multimodal",
    icon: SlidersHorizontal,
    modality: "custom",
    status: "available",
  },

  // ── Computer Vision ──────────────────────────────────────────────────────
  {
    id: "image-classification",
    label: "Image Classification",
    description: "Assign one or more classes to the whole image",
    category: "Computer Vision",
    dataKind: "image",
    icon: Tags,
    projectType: "classification",
    modality: "image",
    task: "classification",
    status: "available",
  },
  {
    id: "object-detection",
    label: "Object Detection",
    description: "Draw bounding boxes around objects",
    category: "Computer Vision",
    dataKind: "image",
    icon: SquareDashed,
    projectType: "object_detection",
    modality: "image",
    task: "detection",
    status: "available",
  },
  {
    id: "semantic-segmentation",
    label: "Semantic Segmentation",
    description: "Outline objects with polygons",
    category: "Computer Vision",
    dataKind: "image",
    icon: Shapes,
    projectType: "segmentation",
    modality: "image",
    task: "segmentation",
    status: "available",
  },
  {
    id: "keypoints",
    label: "Keypoint Labeling",
    description: "Place points / landmarks on objects",
    category: "Computer Vision",
    dataKind: "image",
    icon: Spline,
    projectType: "image_annotation",
    modality: "image",
    task: "keypoints",
    status: "available",
  },
  {
    id: "mixed",
    label: "Mixed / All tools",
    description: "Boxes, polygons, points, lines, circles",
    category: "Computer Vision",
    dataKind: "image",
    icon: PenTool,
    projectType: "image_annotation",
    modality: "image",
    task: "detection",
    status: "available",
  },
  {
    id: "brush-segmentation",
    label: "Brush / Mask Segmentation",
    description: "Pixel-accurate masks with a brush",
    category: "Computer Vision",
    dataKind: "image",
    icon: Brush,
    projectType: "segmentation",
    modality: "image",
    task: "segmentation",
    status: "available",
  },
  {
    id: "ocr",
    label: "Optical Character Recognition",
    description: "Transcribe text regions in images",
    category: "Computer Vision",
    dataKind: "image",
    icon: ScanText,
    modality: "custom",
    status: "available",
  },
  {
    id: "image-captioning",
    label: "Image Captioning",
    description: "Write a natural-language caption per image",
    category: "Computer Vision",
    dataKind: "image",
    icon: MessageSquareText,
    modality: "custom",
    status: "available",
  },
  {
    id: "visual-qa",
    label: "Visual Question Answering",
    description: "Answer questions grounded in an image",
    category: "Computer Vision",
    dataKind: "image",
    icon: HelpCircle,
    modality: "custom",
    status: "available",
  },
  {
    id: "multi-image-classification",
    label: "Multi-Image Classification",
    description: "Classify across several images per task",
    category: "Computer Vision",
    dataKind: "image",
    icon: Tags,
    status: "pending",
  },
  {
    id: "medical-image-classification",
    label: "Medical Image Classification",
    description: "Boxes + class on medical images",
    category: "Computer Vision",
    dataKind: "image",
    icon: Shapes,
    modality: "custom",
    status: "available",
  },
  {
    id: "ocr-pdf",
    label: "OCR Labeling for PDFs",
    description: "Transcribe text regions across PDF pages",
    category: "Computer Vision",
    dataKind: "image",
    icon: ScanText,
    status: "pending",
  },
  {
    id: "ellipse",
    label: "Ellipse Labeling",
    description: "Annotate elliptical regions",
    category: "Computer Vision",
    dataKind: "image",
    icon: Circle,
    status: "pending",
  },

  // ── Video ────────────────────────────────────────────────────────────────
  {
    id: "video-classification",
    label: "Video Classification",
    description: "Classify clips or whole videos",
    category: "Video",
    dataKind: "video",
    icon: Clapperboard,
    projectType: "video_annotation",
    modality: "video",
    task: "classification",
    status: "available",
  },
  {
    id: "video-tracking",
    label: "Video Object Tracking",
    description: "Track objects across frames with tracks",
    category: "Video",
    dataKind: "video",
    icon: Video,
    projectType: "video_annotation",
    modality: "video",
    task: "tracking",
    status: "available",
  },
  {
    id: "video-timeline",
    label: "Video Timeline Segmentation",
    description: "Mark events along the timeline",
    category: "Video",
    dataKind: "video",
    icon: Film,
    projectType: "video_annotation",
    modality: "video",
    task: "tracking",
    status: "available",
  },

  // ── Natural Language ─────────────────────────────────────────────────────
  {
    id: "text-classification",
    label: "Text Classification",
    description: "Categorize documents or sentences",
    category: "Natural Language",
    dataKind: "text",
    icon: Type,
    projectType: "text_annotation",
    modality: "text",
    task: "text_classification",
    status: "available",
  },
  {
    id: "ner",
    label: "Named Entity Recognition",
    description: "Span-label entities in text",
    category: "Natural Language",
    dataKind: "text",
    icon: FileText,
    projectType: "text_annotation",
    modality: "text",
    task: "ner",
    status: "available",
  },
  {
    id: "taxonomy",
    label: "Taxonomy",
    description: "Apply multiple labels per document",
    category: "Natural Language",
    dataKind: "text",
    icon: ListTree,
    projectType: "text_annotation",
    modality: "text",
    task: "taxonomy",
    status: "available",
  },
  {
    id: "relation-extraction",
    label: "Relation Extraction",
    description: "Link entities with relations",
    category: "Natural Language",
    dataKind: "text",
    icon: Link2,
    projectType: "text_annotation",
    modality: "text",
    task: "relation_extraction",
    status: "available",
  },
  {
    id: "question-answering",
    label: "Question Answering",
    description: "Select answer spans for questions",
    category: "Natural Language",
    dataKind: "text",
    icon: HelpCircle,
    projectType: "text_annotation",
    modality: "text",
    task: "question_answering",
    status: "available",
  },
  {
    id: "translation",
    label: "Machine Translation",
    description: "Translate / post-edit text",
    category: "Natural Language",
    dataKind: "text",
    icon: Languages,
    projectType: "text_annotation",
    modality: "text",
    task: "translation",
    status: "available",
  },
  {
    id: "text-summarization",
    label: "Text Summarization",
    description: "Write a summary of a document",
    category: "Natural Language",
    dataKind: "text",
    icon: FileText,
    modality: "custom",
    status: "available",
  },
  {
    id: "content-moderation",
    label: "Content Moderation",
    description: "Flag documents with policy categories",
    category: "Natural Language",
    dataKind: "text",
    icon: Tags,
    projectType: "text_annotation",
    modality: "text",
    task: "text_classification",
    status: "available",
  },

  // ── Audio & Speech ───────────────────────────────────────────────────────
  {
    id: "audio-classification",
    label: "Audio Classification",
    description: "Tag regions of a clip with classes",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: AudioLines,
    projectType: "audio_annotation",
    modality: "audio",
    task: "audio_classification",
    status: "available",
  },
  {
    id: "asr",
    label: "Speech Recognition (ASR)",
    description: "Transcribe speech regions to text",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: Mic,
    projectType: "audio_annotation",
    modality: "audio",
    task: "transcription",
    status: "available",
  },
  {
    id: "speaker-segmentation",
    label: "Speaker Segmentation",
    description: "Diarize speakers across time",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: Waves,
    projectType: "audio_annotation",
    modality: "audio",
    task: "diarization",
    status: "available",
  },
  {
    id: "asr-segments",
    label: "ASR using Segments",
    description: "Transcribe speech region by region",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: Mic,
    projectType: "audio_annotation",
    modality: "audio",
    task: "transcription",
    status: "available",
  },
  {
    id: "sound-event-detection",
    label: "Sound Event Detection",
    description: "Label sound events along the clip",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: AudioLines,
    projectType: "audio_annotation",
    modality: "audio",
    task: "audio_classification",
    status: "available",
  },
  {
    id: "voice-activity-detection",
    label: "Voice Activity Detection",
    description: "Mark speech vs. non-speech regions",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: Activity,
    projectType: "audio_annotation",
    modality: "audio",
    task: "audio_classification",
    status: "available",
  },

  // ── Conversational AI ────────────────────────────────────────────────────
  {
    id: "intent-slot",
    label: "Intent & Slot Filling",
    description: "Classify intent and tag slots",
    category: "Conversational AI",
    dataKind: "text",
    icon: MessagesSquare,
    modality: "custom",
    status: "available",
  },
  {
    id: "response-generation",
    label: "Response Generation",
    description: "Write assistant responses",
    category: "Conversational AI",
    dataKind: "text",
    icon: MessagesSquare,
    modality: "custom",
    status: "available",
  },
  {
    id: "coreference",
    label: "Coreference & Entity Linking",
    description: "Link mentions that refer to the same entity",
    category: "Conversational AI",
    dataKind: "text",
    icon: Link2,
    projectType: "text_annotation",
    modality: "text",
    task: "relation_extraction",
    status: "available",
  },

  // ── Ranking & Scoring ────────────────────────────────────────────────────
  {
    id: "pairwise",
    label: "Pairwise Comparison",
    description: "Pick the better of two items",
    category: "Ranking & Scoring",
    dataKind: "ranking",
    icon: Scale,
    status: "pending",
  },
  {
    id: "document-retrieval",
    label: "Document Retrieval",
    description: "Rank documents by relevance",
    category: "Ranking & Scoring",
    dataKind: "ranking",
    icon: Search,
    status: "pending",
  },
  {
    id: "search-ranking",
    label: "Search Page Ranking",
    description: "Order search results",
    category: "Ranking & Scoring",
    dataKind: "ranking",
    icon: ListOrdered,
    status: "pending",
  },
  {
    id: "website-rating",
    label: "Website Rating",
    description: "Rate pages on quality scales",
    category: "Ranking & Scoring",
    dataKind: "ranking",
    icon: Scale,
    status: "pending",
  },
  {
    id: "content-image-retrieval",
    label: "Content-based Image Retrieval",
    description: "Rank images by relevance to a query",
    category: "Ranking & Scoring",
    dataKind: "ranking",
    icon: Search,
    status: "pending",
  },

  // ── Structured Data ──────────────────────────────────────────────────────
  {
    id: "html-ner",
    label: "HTML Entity Recognition",
    description: "Label spans in rendered HTML",
    category: "Structured Data",
    dataKind: "html",
    icon: Code2,
    status: "pending",
  },
  {
    id: "tabular",
    label: "Tabular Data",
    description: "Label rows / cells in tables",
    category: "Structured Data",
    dataKind: "html",
    icon: Table,
    status: "pending",
  },
  {
    id: "html-classification",
    label: "HTML Classification",
    description: "Classify rendered HTML documents",
    category: "Structured Data",
    dataKind: "html",
    icon: Code2,
    status: "pending",
  },
  {
    id: "pdf-classification",
    label: "PDF Classification",
    description: "Classify PDF documents",
    category: "Structured Data",
    dataKind: "html",
    icon: FileText,
    status: "pending",
  },

  // ── Time Series ──────────────────────────────────────────────────────────
  {
    id: "timeseries-labeling",
    label: "Time Series Labeling",
    description: "Segment regions of a signal",
    category: "Time Series",
    dataKind: "timeseries",
    icon: LineChart,
    status: "pending",
  },
  {
    id: "change-point",
    label: "Change Point Detection",
    description: "Mark regime changes",
    category: "Time Series",
    dataKind: "timeseries",
    icon: Activity,
    status: "pending",
  },
  {
    id: "timeseries-classification",
    label: "Time Series Classification",
    description: "Classify whole signals",
    category: "Time Series",
    dataKind: "timeseries",
    icon: LineChart,
    status: "pending",
  },
  {
    id: "anomaly-detection",
    label: "Outliers & Anomaly Detection",
    description: "Mark anomalous regions in a signal",
    category: "Time Series",
    dataKind: "timeseries",
    icon: Activity,
    status: "pending",
  },

  // ── Generative AI / LLM ──────────────────────────────────────────────────
  {
    id: "rlhf",
    label: "Human Preference (RLHF)",
    description: "Rank model outputs for alignment",
    category: "Generative AI / LLM",
    dataKind: "multimodal",
    icon: Sparkles,
    status: "pending",
  },
  {
    id: "chatbot-assessment",
    label: "Chatbot Assessment",
    description: "Rate assistant conversations",
    category: "Generative AI / LLM",
    dataKind: "multimodal",
    icon: MessagesSquare,
    status: "pending",
  },
  {
    id: "llm-response-grading",
    label: "LLM Response Grading",
    description: "Score a single model response",
    category: "Generative AI / LLM",
    dataKind: "multimodal",
    icon: Sparkles,
    status: "pending",
  },
  {
    id: "side-by-side-llm",
    label: "Side-by-Side LLM Comparison",
    description: "Compare two model outputs",
    category: "Generative AI / LLM",
    dataKind: "multimodal",
    icon: Scale,
    status: "pending",
  },
  {
    id: "rag-evaluation",
    label: "RAG Evaluation",
    description: "Rate retrieval-augmented answers",
    category: "Generative AI / LLM",
    dataKind: "multimodal",
    icon: Sparkles,
    status: "pending",
  },
]

// Category display order (Label Studio groups templates the same way).
export const TEMPLATE_CATEGORY_ORDER = [
  "Custom",
  "Computer Vision",
  "Video",
  "Natural Language",
  "Audio & Speech",
  "Conversational AI",
  "Ranking & Scoring",
  "Structured Data",
  "Time Series",
  "Generative AI / LLM",
  "Community Contributions",
]

// Merge in the authentic Label Studio templates (configs converted to our JSON
// in ls-gallery.ts). Matched ids get LS's preview image; LS templates we don't
// already have are appended as config-driven ("custom") entries.
const LS_GROUP_CATEGORY: Record<string, string> = {
  "Computer Vision": "Computer Vision",
  "Natural Language Processing": "Natural Language",
  "Audio/Speech Processing": "Audio & Speech",
  "Ranking & Scoring": "Ranking & Scoring",
  "Structured Data Parsing": "Structured Data",
  "Time Series Analysis": "Time Series",
  Videos: "Video",
  "Community Contributions": "Community Contributions",
}
const LS_GROUP_ICON: Record<string, LucideIcon> = {
  "Computer Vision": SquareDashed,
  "Natural Language Processing": Type,
  "Audio/Speech Processing": AudioLines,
  "Ranking & Scoring": Scale,
  "Structured Data Parsing": Table,
  "Time Series Analysis": LineChart,
  Videos: Video,
  "Community Contributions": Sparkles,
}

const existingIds = new Set(LABELING_TEMPLATES.map((t) => t.id))
for (const ls of LS_TEMPLATES) {
  const match = LABELING_TEMPLATES.find((t) => t.id === ls.id)
  if (match) {
    // Upgrade an existing card with LS's authentic preview image.
    if (ls.image && !match.image) match.image = ls.image
    continue
  }
  if (existingIds.has(ls.id)) continue
  existingIds.add(ls.id)
  LABELING_TEMPLATES.push({
    id: ls.id,
    label: ls.label,
    description: "Label Studio template",
    category: LS_GROUP_CATEGORY[ls.group] ?? "Custom",
    dataKind: ls.dataKind as DataKind,
    icon: LS_GROUP_ICON[ls.group] ?? SlidersHorizontal,
    modality: "custom",
    image: ls.image,
    status: ls.supported ? "available" : "pending",
  })
}

export function templatesGroupedByCategory(): {
  category: string
  templates: LabelingTemplate[]
}[] {
  return TEMPLATE_CATEGORY_ORDER.map((category) => ({
    category,
    templates: LABELING_TEMPLATES.filter((t) => t.category === category),
  })).filter((group) => group.templates.length > 0)
}

export const DATA_KIND_LABELS: Record<DataKind, string> = {
  image: "Images",
  video: "Video",
  text: "Text",
  audio: "Audio",
  timeseries: "Time series",
  html: "HTML / structured",
  ranking: "Ranking",
  multimodal: "Multimodal",
}
