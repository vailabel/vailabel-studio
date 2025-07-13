"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
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
import { useCanvasStore } from "@/stores/canvas-store"

interface ContextMenuProps {
  x: number
  y: number
  containerRect: DOMRect | null
  onClose: () => void
}

export function ContextMenu({
  x,
  y,
  containerRect,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { setSelectedTool, resetView } = useCanvasStore()

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

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "absolute z-50 w-48 rounded-md shadow-lg ring-1 ring-opacity-5",
        "dark:bg-gray-800 dark:ring-gray-700",
        "bg-white ring-gray-200"
      )}
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="py-1">
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => handleToolSelect("select")}
        >
          <Brain className="mr-2 h-4 w-4" />
          AI Detection
        </button>
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => handleToolSelect("move")}
        >
          <Move className="mr-2 h-4 w-4" />
          Move
        </button>
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => handleToolSelect("box")}
        >
          <Square className="mr-2 h-4 w-4" />
          Draw Box
        </button>
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => handleToolSelect("polygon")}
        >
          <Polygon className="mr-2 h-4 w-4" />
          Draw Polygon
        </button>
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => handleToolSelect("freeDraw")}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Free Draw
        </button>
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => handleToolSelect("delete")}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </button>
        <div
          className={cn(
            "my-1 border-t",
            "dark:border-gray-700",
            "border-gray-200"
          )}
        ></div>
        <button
          className={cn(
            "flex w-full items-center px-4 py-2 text-sm",
            "dark:text-gray-300 dark:hover:bg-gray-700",
            "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => resetView()}
        >
          <ZoomIn className="mr-2 h-4 w-4" />
          Reset Zoom
        </button>
      </div>
    </motion.div>
  )
}
