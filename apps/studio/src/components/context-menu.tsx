"use client"

import { useRef, useEffect, memo, useMemo } from "react"
import {
  Square,
  OctagonIcon as Polygon,
  Move,
  Trash2,
  ZoomIn,
  Pencil,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCanvasTool, useCanvasZoom, useCanvasPan } from "@/contexts/canvas-context"

interface ContextMenuProps {
  x: number
  y: number
  containerRect: DOMRect | null
  onClose: () => void
}

export const ContextMenu = memo(
  ({ x, y, containerRect, onClose }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null)
    const { setSelectedTool } = useCanvasTool()
    const { resetView } = useCanvasPan()

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose()
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    const handleToolSelect = (tool: string) => {
      setSelectedTool(tool)
      onClose()
    }

    // Memoize position calculation to prevent unnecessary recalculations
    const menuPosition = useMemo(() => {
      // Calculate position relative to the container
      const menuX = containerRect ? Math.max(0, x - containerRect.left) : x
      const menuY = containerRect ? Math.max(0, y - containerRect.top) : y

      // Adjust position to ensure menu stays within viewport
      const adjustedX = Math.min(
        menuX,
        (containerRect?.width || window.innerWidth) - 200
      )
      const adjustedY = Math.min(
        menuY,
        (containerRect?.height || window.innerHeight) - 250
      )

      return { x: adjustedX, y: adjustedY }
    }, [x, y, containerRect])

    return (
      <div
        ref={menuRef}
        className={cn(
          "absolute z-50 w-48 rounded-md shadow-lg ring-1 ring-opacity-5 transition-all duration-200",
          "bg-background border border-border"
        )}
        style={{ left: menuPosition.x, top: menuPosition.y }}
      >
        <div className="py-1">
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => handleToolSelect("select")}
          >
            <Brain className="mr-2 h-4 w-4" />
            AI Detection
          </button>
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => handleToolSelect("move")}
          >
            <Move className="mr-2 h-4 w-4" />
            Move
          </button>
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => handleToolSelect("box")}
          >
            <Square className="mr-2 h-4 w-4" />
            Draw Box
          </button>
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => handleToolSelect("polygon")}
          >
            <Polygon className="mr-2 h-4 w-4" />
            Draw Polygon
          </button>
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => handleToolSelect("freeDraw")}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Free Draw
          </button>
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => handleToolSelect("delete")}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </button>
          <div
            className={cn(
              "my-1 border-t",
              "border-border"
            )}
          ></div>
          <button
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm",
              "text-foreground hover:bg-muted",
              ""
            )}
            onClick={() => resetView()}
          >
            <ZoomIn className="mr-2 h-4 w-4" />
            Reset Zoom
          </button>
        </div>
      </div>
    )
  }
)
