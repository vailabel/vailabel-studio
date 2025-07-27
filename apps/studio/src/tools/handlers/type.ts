/* eslint-disable @typescript-eslint/no-explicit-any */

import { Point } from "@vailabel/core"

// Interface for tool handlers
export interface ToolHandler {
  onMouseDown(e: React.MouseEvent, ...args: any[]): void
  onMouseMove(e: React.MouseEvent, point: Point, ...args: any[]): void
  onMouseUp(e: React.MouseEvent, ...args: any[]): void
  getUIState(): any
}
