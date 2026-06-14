import type { CanvasTool } from "@/features/studio/types"

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

const ALL_TOOLS: CanvasTool[] = [
  "move",
  "box",
  "polygon",
  "freeDraw",
  "point",
  "line",
  "linestrip",
  "circle",
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
        tools: ["move", "polygon", "freeDraw", "delete"],
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
