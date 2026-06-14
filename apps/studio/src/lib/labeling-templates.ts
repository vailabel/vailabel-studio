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
  type LucideIcon,
} from "lucide-react"

// Project types that map to a working editor today. Kept as string literals so
// this catalog stays decoupled from the create viewmodel (which also exports
// PROJECT_TYPES with the same values).
type WorkingProjectType =
  | "object_detection"
  | "segmentation"
  | "classification"
  | "image_annotation"

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
  status: TemplateStatus
}

// Mirrors the Label Studio template gallery. Only the image templates have a
// working editor today; everything else is declared as `pending` so the create
// screen shows the full roadmap without offering broken flows.
export const LABELING_TEMPLATES: LabelingTemplate[] = [
  // ── Computer Vision ──────────────────────────────────────────────────────
  {
    id: "image-classification",
    label: "Image Classification",
    description: "Assign one or more classes to the whole image",
    category: "Computer Vision",
    dataKind: "image",
    icon: Tags,
    projectType: "classification",
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
    status: "available",
  },
  {
    id: "brush-segmentation",
    label: "Brush / Mask Segmentation",
    description: "Pixel-accurate masks with a brush",
    category: "Computer Vision",
    dataKind: "image",
    icon: Brush,
    status: "pending",
  },
  {
    id: "ocr",
    label: "Optical Character Recognition",
    description: "Transcribe text regions in images",
    category: "Computer Vision",
    dataKind: "image",
    icon: ScanText,
    status: "pending",
  },
  {
    id: "image-captioning",
    label: "Image Captioning",
    description: "Write a natural-language caption per image",
    category: "Computer Vision",
    dataKind: "image",
    icon: MessageSquareText,
    status: "pending",
  },
  {
    id: "visual-qa",
    label: "Visual Question Answering",
    description: "Answer questions grounded in an image",
    category: "Computer Vision",
    dataKind: "image",
    icon: HelpCircle,
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
    status: "pending",
  },
  {
    id: "video-tracking",
    label: "Video Object Tracking",
    description: "Track objects across frames with tracks",
    category: "Video",
    dataKind: "video",
    icon: Video,
    status: "pending",
  },
  {
    id: "video-timeline",
    label: "Video Timeline Segmentation",
    description: "Mark events along the timeline",
    category: "Video",
    dataKind: "video",
    icon: Film,
    status: "pending",
  },

  // ── Natural Language ─────────────────────────────────────────────────────
  {
    id: "text-classification",
    label: "Text Classification",
    description: "Categorize documents or sentences",
    category: "Natural Language",
    dataKind: "text",
    icon: Type,
    status: "pending",
  },
  {
    id: "ner",
    label: "Named Entity Recognition",
    description: "Span-label entities in text",
    category: "Natural Language",
    dataKind: "text",
    icon: FileText,
    status: "pending",
  },
  {
    id: "taxonomy",
    label: "Taxonomy",
    description: "Apply hierarchical labels",
    category: "Natural Language",
    dataKind: "text",
    icon: ListTree,
    status: "pending",
  },
  {
    id: "relation-extraction",
    label: "Relation Extraction",
    description: "Link entities with relations",
    category: "Natural Language",
    dataKind: "text",
    icon: Link2,
    status: "pending",
  },
  {
    id: "question-answering",
    label: "Question Answering",
    description: "Select answer spans for questions",
    category: "Natural Language",
    dataKind: "text",
    icon: HelpCircle,
    status: "pending",
  },
  {
    id: "translation",
    label: "Machine Translation",
    description: "Translate / post-edit text",
    category: "Natural Language",
    dataKind: "text",
    icon: Languages,
    status: "pending",
  },

  // ── Audio & Speech ───────────────────────────────────────────────────────
  {
    id: "audio-classification",
    label: "Audio Classification",
    description: "Tag audio clips with classes",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: AudioLines,
    status: "pending",
  },
  {
    id: "asr",
    label: "Speech Recognition (ASR)",
    description: "Transcribe speech to text",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: Mic,
    status: "pending",
  },
  {
    id: "speaker-segmentation",
    label: "Speaker Segmentation",
    description: "Diarize speakers across time",
    category: "Audio & Speech",
    dataKind: "audio",
    icon: Waves,
    status: "pending",
  },

  // ── Conversational AI ────────────────────────────────────────────────────
  {
    id: "intent-slot",
    label: "Intent & Slot Filling",
    description: "Classify intent and tag slots",
    category: "Conversational AI",
    dataKind: "text",
    icon: MessagesSquare,
    status: "pending",
  },
  {
    id: "response-generation",
    label: "Response Generation",
    description: "Write assistant responses",
    category: "Conversational AI",
    dataKind: "text",
    icon: MessagesSquare,
    status: "pending",
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
]

// Category display order (Label Studio groups templates the same way).
export const TEMPLATE_CATEGORY_ORDER = [
  "Computer Vision",
  "Video",
  "Natural Language",
  "Audio & Speech",
  "Conversational AI",
  "Ranking & Scoring",
  "Structured Data",
  "Time Series",
  "Generative AI / LLM",
]

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
