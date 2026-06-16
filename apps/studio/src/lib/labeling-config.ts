import type { CanvasTool } from "@/features/studio/types"
import type { Modality, Task } from "@/types/modality"

// Drives how the studio adapts to a project's template/type: which tools the
// toolbar exposes, the default tool, and whether the editor is in region-drawing
// or whole-image classification mode.

export type LabelingMode = "regions" | "classification" | "mixed"

export interface LabelingConfig {
  mode: LabelingMode
  /** Annotation tools to expose in the toolbar, in display order. */
  tools: CanvasTool[]
  defaultTool: CanvasTool
  allowsRegions: boolean
  allowsClassification: boolean
}

/** Which editor body the labeler shell mounts for a project. One per modality
 *  family; the registry maps these to editor components. */
export type EditorKind =
  | "canvas"
  | "classification"
  | "text"
  | "audio"
  | "video"
  | "custom"

/**
 * Declarative layout for the studio shell, resolved per project so the shell
 * renders its chrome data-drivenly instead of branching on modality. `itemSource`
 * says where the left file list draws items: "project-images" = dataset rows (the
 * default), "editor" = the editor body owns item selection (video clips live in
 * the VideoEditor, not the dataset). Each flag toggles a shell panel.
 */
export interface StudioChrome {
  itemSource: "project-images" | "editor"
  showFileList: boolean
  showLabelPalette: boolean
  showBottomBar: boolean
}

// Image / text / audio / custom all use the item-centric layout unchanged.
const DEFAULT_CHROME: StudioChrome = {
  itemSource: "project-images",
  showFileList: true,
  showLabelPalette: true,
  showBottomBar: true,
}

// Video owns its own clip switcher, track panel, and timeline inside the editor
// body, so the generic image-centric chrome is hidden to avoid two competing
// navigators (and an always-empty image file list).
const VIDEO_CHROME: StudioChrome = {
  itemSource: "editor",
  showFileList: false,
  showLabelPalette: false,
  showBottomBar: false,
}

/**
 * The full capability set for a project, resolved from the two-axis
 * (modality, task) taxonomy. Superset of `LabelingConfig` — adds the resolved
 * modality/task and which editor body the shell should mount. This is the single
 * registry the shell, toolbar, and (later) modality editors read from, replacing
 * the previously drifting per-feature switches.
 */
export interface Capabilities extends LabelingConfig {
  modality: Modality
  task: Task
  editor: EditorKind
  /** How the studio shell lays out its chrome for this project. */
  chrome: StudioChrome
}

const ALL_TOOLS: CanvasTool[] = [
  "move",
  "box",
  "polygon",
  "freeDraw",
  "point",
  "line",
  "linestrip",
  "circle",
  "smartSegment",
  "delete",
]

export function getLabelingConfig(projectType?: string): LabelingConfig {
  switch (projectType) {
    case "object_detection":
      return {
        mode: "regions",
        tools: ["move", "box", "delete"],
        defaultTool: "box",
        allowsRegions: true,
        allowsClassification: false,
      }
    case "segmentation":
      return {
        mode: "regions",
        tools: ["move", "polygon", "freeDraw", "smartSegment", "delete"],
        defaultTool: "polygon",
        allowsRegions: true,
        allowsClassification: false,
      }
    case "classification":
      return {
        mode: "classification",
        tools: ["move"],
        defaultTool: "move",
        allowsRegions: false,
        allowsClassification: true,
      }
    case "image_annotation":
    default:
      return {
        mode: "mixed",
        tools: ALL_TOOLS,
        defaultTool: "move",
        allowsRegions: true,
        allowsClassification: false,
      }
  }
}

function normalizeModality(modality?: string): Modality {
  switch (modality) {
    case "video":
    case "text":
    case "audio":
    case "custom":
      return modality
    default:
      return "image"
  }
}

/** Best-effort legacy `project.type` for an image task, so a single source of
 *  truth (`getLabelingConfig`) keeps producing identical tool sets. */
function legacyTypeForImageTask(task: Task): string {
  switch (task) {
    case "detection":
      return "object_detection"
    case "segmentation":
      return "segmentation"
    case "classification":
      return "classification"
    default:
      return "image_annotation"
  }
}

function deriveTaskFromLegacyType(projectType?: string): Task {
  switch (projectType) {
    case "object_detection":
      return "detection"
    case "segmentation":
      return "segmentation"
    case "classification":
      return "classification"
    case "keypoints":
    case "keypoint":
      return "keypoints"
    default:
      return "detection"
  }
}

/**
 * Resolve the full capability set for a project from its (modality, task) pair,
 * falling back to the legacy single `projectType` for older projects. Image
 * modalities reuse `getLabelingConfig` verbatim (so tool sets stay byte-identical);
 * other modalities get a sensible toolset and the editor body the shell mounts.
 */
export function resolveCapabilities(input: {
  modality?: string
  task?: string
  projectType?: string
}): Capabilities {
  const modality = normalizeModality(input.modality)
  const task = (input.task as Task) || deriveTaskFromLegacyType(input.projectType)

  // Custom (config-driven) projects: the labeling config decides the UI, so the
  // shell just mounts the config editor and the engine does the rest.
  if (modality === "custom") {
    return {
      mode: "mixed",
      tools: [],
      defaultTool: "move",
      allowsRegions: false,
      allowsClassification: false,
      modality,
      task,
      editor: "custom",
      chrome: DEFAULT_CHROME,
    }
  }

  if (modality === "image") {
    const base = getLabelingConfig(input.projectType ?? legacyTypeForImageTask(task))
    return {
      ...base,
      modality,
      task,
      editor: base.mode === "classification" ? "classification" : "canvas",
      chrome: DEFAULT_CHROME,
    }
  }

  if (modality === "text") {
    // Span tasks select character ranges; class tasks tag the whole document.
    // Translation produces free text (neither). The text editor switches its
    // interaction layer on `task`.
    const spanTasks: Task[] = ["ner", "question_answering", "relation_extraction"]
    const classTasks: Task[] = ["text_classification", "taxonomy"]
    return {
      mode: classTasks.includes(task) ? "classification" : "regions",
      tools: ["move", "delete"],
      defaultTool: "move",
      allowsRegions: spanTasks.includes(task),
      allowsClassification: classTasks.includes(task),
      modality,
      task,
      editor: "text",
      chrome: DEFAULT_CHROME,
    }
  }

  // audio gets a waveform editor; video gets the full FFmpeg pipeline editor,
  // which owns its own chrome (clip library + timeline + track panel).
  const isVideo = modality === "video"
  return {
    mode: "regions",
    tools: ["move", "delete"],
    defaultTool: "move",
    allowsRegions: true,
    allowsClassification: false,
    modality,
    task,
    editor: isVideo ? "video" : "audio",
    chrome: isVideo ? VIDEO_CHROME : DEFAULT_CHROME,
  }
}
