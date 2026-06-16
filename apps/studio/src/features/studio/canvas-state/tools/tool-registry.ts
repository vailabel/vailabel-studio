import type { CanvasTool } from "@/features/studio/model/types"
import type { ToolHandler } from "./tool-handlers"
import type { ToolHandlerContext } from "./handlers/tool-handler-context"
import { MoveHandler } from "./handlers/move-handler"
import { BoxHandler } from "./handlers/box-handler"
import { PolygonHandler } from "./handlers/polygon-handler"
import { FreeDrawHandler } from "./handlers/free-draw-handler"
import { DeleteHandler } from "./handlers/delete-handler"
import { PointHandler } from "./handlers/point-handler"
import { LineHandler } from "./handlers/line-handler"
import { LinestripHandler } from "./handlers/linestrip-handler"
import { CircleHandler } from "./handlers/circle-handler"
import { SmartSegmentHandler } from "./handlers/smart-segment-handler"

/**
 * Static description of a labeling tool: its id, single-key shortcut, and how to
 * build its handler. Registering a new tool means adding one entry here — the
 * dispatcher, the keyboard shortcuts, and any consumer that iterates the tools
 * all derive from this list (OCP: open for extension, closed for modification).
 */
export interface ToolDefinition {
  id: CanvasTool
  /** Lower-case single-key shortcut that activates the tool. */
  hotkey: string
  createHandler: (context: ToolHandlerContext) => ToolHandler
}

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  { id: "move", hotkey: "m", createHandler: (c) => new MoveHandler(c) },
  { id: "box", hotkey: "b", createHandler: (c) => new BoxHandler(c) },
  { id: "polygon", hotkey: "p", createHandler: (c) => new PolygonHandler(c) },
  { id: "freeDraw", hotkey: "f", createHandler: (c) => new FreeDrawHandler(c) },
  { id: "delete", hotkey: "d", createHandler: (c) => new DeleteHandler(c) },
  { id: "point", hotkey: "o", createHandler: (c) => new PointHandler(c) },
  { id: "line", hotkey: "l", createHandler: (c) => new LineHandler(c) },
  {
    id: "linestrip",
    hotkey: "s",
    createHandler: (c) => new LinestripHandler(c),
  },
  { id: "circle", hotkey: "c", createHandler: (c) => new CircleHandler(c) },
  {
    id: "smartSegment",
    hotkey: "g",
    createHandler: (c) => new SmartSegmentHandler(c),
  },
]

const TOOL_BY_ID = new Map<string, ToolDefinition>(
  TOOL_DEFINITIONS.map((definition) => [definition.id, definition])
)

/** Maps a lower-case shortcut key to the tool it activates (e.g. `b` → `box`). */
export const TOOL_HOTKEYS: Readonly<Record<string, CanvasTool>> =
  Object.fromEntries(
    TOOL_DEFINITIONS.map((definition) => [definition.hotkey, definition.id])
  )

/** Build the handler for the given tool id. Throws on an unknown tool. */
export function createToolHandler(
  tool: string,
  context: ToolHandlerContext
): ToolHandler {
  const definition = TOOL_BY_ID.get(tool)
  if (!definition) {
    throw new Error(`Unknown tool: ${tool}`)
  }
  return definition.createHandler(context)
}
