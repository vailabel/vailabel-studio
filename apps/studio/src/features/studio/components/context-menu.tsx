"use client"

import { useRef, useEffect, memo, useMemo } from "react"
import {
  Square,
  OctagonIcon as Polygon,
  Move,
  Trash2,
  ZoomIn,
  Pencil,
  Spline,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { CanvasTool } from "@/features/studio/model/types"

interface ContextMenuProps {
  x: number
  y: number
  containerRect: DOMRect | null
  onSelectTool: (tool: CanvasTool) => void
  onResetView: () => void
  onClose: () => void
  /** Shown only when a polygon / free-draw shape is selected. */
  canSimplify?: boolean
  onSimplify?: () => void
}

export const ContextMenu = memo(
  ({
    x,
    y,
    containerRect,
    onSelectTool,
    onResetView,
    onClose,
    canSimplify = false,
    onSimplify,
  }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          onClose()
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    const handleToolSelect = (tool: CanvasTool) => {
      onSelectTool(tool)
      onClose()
    }

    const menuPosition = useMemo(() => {
      const menuX = containerRect ? Math.max(0, x - containerRect.left) : x
      const menuY = containerRect ? Math.max(0, y - containerRect.top) : y
      const adjustedX = Math.min(
        menuX,
        (containerRect?.width || window.innerWidth) - 200
      )
      const adjustedY = Math.min(
        menuY,
        (containerRect?.height || window.innerHeight) - 250
      )

      return { x: adjustedX, y: adjustedY }
    }, [containerRect, x, y])

    return (
      <div
        ref={menuRef}
        className={cn(
          "absolute z-50 w-48 rounded-md border border-border bg-background shadow-lg ring-1 ring-opacity-5"
        )}
        style={{ left: menuPosition.x, top: menuPosition.y }}
      >
        <div className="py-1">
          {canSimplify && onSimplify ? (
            <>
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => {
                  onSimplify()
                  onClose()
                }}
              >
                <Spline className="mr-2 h-4 w-4" />
                Simplify shape
              </button>
              <div className="my-1 border-t border-border"></div>
            </>
          ) : null}
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("move")}
          >
            <Move className="mr-2 h-4 w-4" />
            Move
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("box")}
          >
            <Square className="mr-2 h-4 w-4" />
            Draw Box
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("polygon")}
          >
            <Polygon className="mr-2 h-4 w-4" />
            Draw Polygon
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("freeDraw")}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Free Draw
          </button>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => handleToolSelect("delete")}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </button>
          <div className="my-1 border-t border-border"></div>
          <button
            className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
            onClick={() => {
              onResetView()
              onClose()
            }}
          >
            <ZoomIn className="mr-2 h-4 w-4" />
            Reset Zoom
          </button>
        </div>
      </div>
    )
  }
)

ContextMenu.displayName = "ContextMenu"
