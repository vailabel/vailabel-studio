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

/** Which editor body the labeler shell mounts for a project (Phase 2 seam). */
export type EditorKind = "canvas" | "classification" | "text" | "timeline"

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

  if (modality === "image") {
    const base = getLabelingConfig(input.projectType ?? legacyTypeForImageTask(task))
    return {
      ...base,
      modality,
      task,
      editor: base.mode === "classification" ? "classification" : "canvas",
    }
  }

  if (modality === "text") {
    return {
      mode: task === "text_classification" ? "classification" : "regions",
      tools: ["move", "delete"],
      defaultTool: "move",
      allowsRegions: task !== "text_classification",
      allowsClassification: task === "text_classification",
      modality,
      task,
      editor: "text",
    }
  }

  // audio + video share a timeline-style editor; tooling is fleshed out in the
  // dedicated modality phases.
  return {
    mode: "regions",
    tools: ["move", "delete"],
    defaultTool: "move",
    allowsRegions: true,
    allowsClassification: false,
    modality,
    task,
    editor: "timeline",
  }
}
