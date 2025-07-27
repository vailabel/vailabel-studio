
export { MoveHandler, type MoveHandlerUIState } from "./handlers/move-handler"
export { BoxHandler,type BoxHandlerUIState } from "./handlers/box-handler"
export { PolygonHandler,type PolygonHandlerUIState } from "./handlers/polygon-handler"
export { FreeDrawHandler,type FreeDrawHandlerUIState } from "./handlers/free-draw-handler"
export { DeleteHandler, type DeleteHandlerUIState } from "./handlers/delete-handler"

import type { Point } from "@vailabel/core"

export type ToolHandlerUIState =
  | import("./handlers/move-handler").MoveHandlerUIState
  | import("./handlers/box-handler").BoxHandlerUIState
  | import("./handlers/polygon-handler").PolygonHandlerUIState
  | import("./handlers/free-draw-handler").FreeDrawHandlerUIState
  | import("./handlers/delete-handler").DeleteHandlerUIState

export interface ToolHandler {
  onMouseDown(e: React.MouseEvent): void
  onMouseMove(e: React.MouseEvent, point: Point): void
  onMouseUp(): void
  onDoubleClick?(): void
  getUIState(): ToolHandlerUIState
}
