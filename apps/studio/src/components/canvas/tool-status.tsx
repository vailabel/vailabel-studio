import { memo, type ReactNode } from "react"

interface ToolStatusProps {
  tool: string
  isVisible: boolean
  pointCount?: number
  isDragging?: boolean
  isDrawing?: boolean
  isMoving?: boolean
  isResizing?: boolean
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
    {children}
  </kbd>
)

/**
 * Compact in-canvas hint pill telling the user how to use the active drawing
 * tool — crucially, how to FINISH multi-point shapes (double-click / Enter), so
 * they don't have to discover the click-the-first-point trick on their own.
 * Functional feedback only (no decorative motion).
 */
export const ToolStatus = memo(
  ({
    tool,
    isVisible,
    pointCount = 0,
    isDragging = false,
    isDrawing = false,
    isMoving = false,
    isResizing = false,
  }: ToolStatusProps) => {
    if (!isVisible) return null

    const hint = ((): ReactNode => {
      switch (tool) {
        case "move":
          if (isMoving) return "Moving…"
          if (isResizing) return "Resizing…"
          return "Drag a shape to move it · drag its handles to resize"

        case "box":
          return isDragging ? (
            "Release to finish the box"
          ) : (
            <>Click &amp; drag to draw a box</>
          )

        case "circle":
          return isDragging
            ? "Release to finish the circle"
            : "Click & drag to draw a circle"

        case "line":
          return isDragging
            ? "Release to finish the line"
            : "Click & drag to draw a line"

        case "point":
          return "Click to place a point"

        case "freeDraw":
          return isDrawing
            ? "Release to finish the freehand shape"
            : "Click & drag to draw freehand"

        case "polygon":
          if (pointCount === 0) return "Click to place the first point"
          if (pointCount < 3)
            return `Click to add points — ${3 - pointCount} more to close`
          return (
            <span className="flex items-center gap-1.5">
              Finish: <Kbd>Double-click</Kbd> or <Kbd>Enter</Kbd> or click the
              first point · <Kbd>Esc</Kbd> cancel
            </span>
          )

        case "linestrip":
          if (pointCount === 0) return "Click to place the first point"
          if (pointCount < 2) return "Click to add another point"
          return (
            <span className="flex items-center gap-1.5">
              Finish: <Kbd>Double-click</Kbd> or <Kbd>Enter</Kbd> ·{" "}
              <Kbd>Esc</Kbd> cancel
            </span>
          )

        case "smartSegment":
          return "Click an object (or drag a box around it) to auto-segment"

        case "delete":
          return "Click a shape to delete it"

        default:
          return null
      }
    })()

    if (!hint) return null

    return (
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
          {hint}
        </div>
      </div>
    )
  }
)

ToolStatus.displayName = "ToolStatus"
