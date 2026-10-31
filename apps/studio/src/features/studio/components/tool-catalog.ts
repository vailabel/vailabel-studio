import {
  Circle,
  Dot,
  Move,
  OctagonIcon as Polygon,
  Pencil,
  Slash,
  Spline,
  Square,
  Trash2,
  Wand2,
} from "lucide-react"
import type { CanvasTool } from "@/features/studio/model/types"

export type ToolGroup = "select" | "draw" | "ai" | "edit"

export interface ToolInfo {
  id: CanvasTool
  name: string
  icon: React.ElementType
  /** Display form of the single-key shortcut (see tool-registry hotkeys). */
  shortcut: string
  /** One plain-language line: what the tool is for and how to use it. */
  description: string
  group: ToolGroup
}

/**
 * Display metadata for every canvas tool, in rail order. Shared by the tool
 * rail and the keyboard-shortcuts sheet so names, keys, and help text never
 * drift. (Behavior + hotkey binding live in canvas-state/tools/tool-registry.)
 */
export const TOOL_CATALOG: readonly ToolInfo[] = [
  {
    id: "move",
    name: "Select & move",
    icon: Move,
    shortcut: "M",
    description:
      "Click a shape to select it, drag to move, drag handles to resize.",
    group: "select",
  },
  {
    id: "box",
    name: "Box",
    icon: Square,
    shortcut: "B",
    description: "Click and drag to draw a rectangle around an object.",
    group: "draw",
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: Polygon,
    shortcut: "P",
    description:
      "Click to add corners; double-click or Enter to close the outline.",
    group: "draw",
  },
  {
    id: "freeDraw",
    name: "Free draw",
    icon: Pencil,
    shortcut: "F",
    description: "Hold and drag to trace an outline freehand.",
    group: "draw",
  },
  {
    id: "circle",
    name: "Circle",
    icon: Circle,
    shortcut: "C",
    description: "Click the center and drag out the radius.",
    group: "draw",
  },
  {
    id: "point",
    name: "Point",
    icon: Dot,
    shortcut: "O",
    description: "Click to mark a single point (keypoints, landmarks).",
    group: "draw",
  },
  {
    id: "line",
    name: "Line",
    icon: Slash,
    shortcut: "L",
    description: "Click and drag to draw a straight line.",
    group: "draw",
  },
  {
    id: "linestrip",
    name: "Line strip",
    icon: Spline,
    shortcut: "S",
    description:
      "Click to add points along a path; double-click or Enter to finish.",
    group: "draw",
  },
  {
    id: "smartSegment",
    name: "AI smart select",
    icon: Wand2,
    shortcut: "G",
    description:
      "Click an object (or drag a box around it) and AI traces its outline.",
    group: "ai",
  },
  {
    id: "delete",
    name: "Eraser",
    icon: Trash2,
    shortcut: "D",
    description: "Click a shape to delete it.",
    group: "edit",
  },
]
