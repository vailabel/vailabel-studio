import type { DataKind } from "@/shared/lib/label-config/labeling-templates"
import type { Task } from "@/shared/types/modality"

// Single source of truth for how the create-project flow treats each data kind.
// One descriptor per kind replaces the boolean cascades / ternary ladders / regex
// soup that used to live in `project-create.tsx` + `project-create-viewmodel.ts`.
// Adding a modality = adding one entry here (Open/Closed), not editing flow logic.

export type ImportMode =
  // Scan a chosen folder for items (LabelMe-style image folders).
  | "folder"
  // Pick individual files via the native dialog (text / audio).
  | "files"
  // Pick CSV/TSV/Excel files, then expand each row into its own task.
  | "spreadsheet"
  // Items are imported later, inside the editor (video clips in the studio).
  | "none"

/** Where `createProject` routes after creating the project (+ first item). */
export type CreateTarget = "studio" | "detail"

export interface ModalityDescriptor {
  /** Canonical data kind; matches `LabelingTemplate.dataKind` + the config object tag. */
  kind: DataKind
  /** Human label used by the Data step (replaces DATA_KIND_LABELS lookups). */
  label: string
  /** Accepted file extensions WITHOUT the dot — drives the picker filter. */
  extensions: string[]
  /** Drag-drop matcher, derived once from `extensions` (no duplicated regex). */
  accepts: (path: string) => boolean
  /** How the create screen imports items for this kind. */
  importMode: ImportMode
  /** Open asset-protocol scope on picked files' dirs (needed to play media). */
  grantScope: boolean
  /** Default `project.settings.annotationTypes` for kinds with no per-task split. */
  annotationTypes: string[]
  /** Where to go after the project is created. */
  target: CreateTarget
  /** Does the project have enough imported to proceed past the Data step? */
  hasItems: (counts: { images: number; documents: number }) => boolean
}

// Build the drag-drop matcher from the extension list so the pattern lives in
// exactly one place. Extensions may themselves be regex fragments (e.g. "jpe?g").
function extMatcher(extensions: string[]): (path: string) => boolean {
  const pattern = new RegExp(`\\.(${extensions.join("|")})$`, "i")
  return (path: string) => pattern.test(path)
}

type DescriptorInput = Omit<ModalityDescriptor, "accepts">

function descriptor(input: DescriptorInput): ModalityDescriptor {
  return { ...input, accepts: extMatcher(input.extensions) }
}

// Only the kinds with a working import + editor are registered. Kinds without an
// entry (timeseries / html / ranking / multimodal) are "roadmap" templates — the
// Data step shows a pending notice rather than offering a broken import.
export const MODALITY_REGISTRY: Partial<Record<DataKind, ModalityDescriptor>> = {
  image: descriptor({
    kind: "image",
    label: "Images",
    extensions: ["jpe?g", "png", "gif", "bmp", "webp", "svg", "tiff?", "avif"],
    importMode: "folder",
    grantScope: false,
    annotationTypes: ["bbox", "polygon", "point"],
    target: "studio",
    hasItems: ({ images }) => images > 0,
  }),
  text: descriptor({
    kind: "text",
    label: "Text",
    extensions: ["txt", "md", "text"],
    importMode: "files",
    grantScope: false,
    annotationTypes: ["span", "classification", "relation", "translation"],
    target: "studio",
    hasItems: ({ documents }) => documents > 0,
  }),
  audio: descriptor({
    kind: "audio",
    label: "Audio",
    extensions: ["wav", "mp3", "ogg", "flac", "m4a", "aac"],
    importMode: "files",
    grantScope: true,
    annotationTypes: ["segment", "classification"],
    target: "studio",
    hasItems: ({ documents }) => documents > 0,
  }),
  video: descriptor({
    kind: "video",
    label: "Video",
    extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"],
    importMode: "files",
    grantScope: true,
    annotationTypes: ["track"],
    target: "studio",
    hasItems: ({ documents }) => documents > 0,
  }),
  tabular: descriptor({
    kind: "tabular",
    label: "Structured data",
    extensions: ["csv", "tsv", "xlsx", "xls", "xlsm", "ods"],
    // Spreadsheets are parsed and exploded into one row-per-task; the resulting
    // rows ride the same `documents` list as picked files (carrying inline data).
    importMode: "spreadsheet",
    grantScope: false,
    annotationTypes: ["classification"],
    target: "studio",
    hasItems: ({ documents }) => documents > 0,
  }),
}

/** The descriptor for a data kind, or `undefined` for an unsupported kind. */
export function descriptorForKind(
  kind: DataKind
): ModalityDescriptor | undefined {
  return MODALITY_REGISTRY[kind]
}

// Image projects split their annotation tools by task (detection → boxes,
// segmentation → polygons/masks, …). The create flow already derives `task` from
// the labeling config, so key off it directly instead of the legacy project-type
// string. Non-image kinds use `descriptor.annotationTypes`.
export function annotationTypesForTask(task: Task): string[] {
  switch (task) {
    case "detection":
      return ["bbox"]
    case "segmentation":
      return ["polygon", "mask"]
    case "classification":
      return ["classification"]
    default:
      return ["bbox", "polygon", "point"]
  }
}
