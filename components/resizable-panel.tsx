"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ResizablePanelProps {
  direction: "horizontal" | "vertical"
  controlPosition?: "left" | "right" | "top" | "bottom"
  defaultSize: number
  minSize?: number
  maxSize?: number
  className?: string
  handleClassName?: string
  children: React.ReactNode
  onResize?: (size: number) => void
}

export function ResizablePanel({
  direction = "horizontal",
  controlPosition = direction === "horizontal" ? "right" : "bottom",
  defaultSize = 300,
  minSize = 200,
  maxSize = 600,
  className,
  handleClassName,
  children,
  onResize,
}: ResizablePanelProps) {
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(size)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY
    startSizeRef.current = size
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const currentPos = direction === "horizontal" ? e.clientX : e.clientY
      const delta = currentPos - startPosRef.current

      const adjustedDelta =
        controlPosition === "left" || controlPosition === "top" ? -delta : delta

      const newSize = Math.max(
        minSize,
        Math.min(maxSize, startSizeRef.current + adjustedDelta)
      )

      setSize(newSize)
      if (onResize) onResize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, minSize, maxSize, direction, controlPosition, onResize])

  return (
    <div
      ref={panelRef}
      className={cn("relative", className)}
      style={{
        [direction === "horizontal" ? "width" : "height"]: `${size}px`,
        flexShrink: 0,
      }}
    >
      {children}
      <div
        className={cn(
          "absolute z-10",
          controlPosition === "left" &&
            "cursor-col-resize left-0 top-0 bottom-0 w-1 border-r border-gray-300",
          controlPosition === "right" &&
            "cursor-col-resize right-0 top-0 bottom-0 w-1 border-l border-gray-300",
          controlPosition === "top" &&
            "cursor-row-resize top-0 left-0 right-0 h-1 border-b border-gray-300",
          controlPosition === "bottom" &&
            "cursor-row-resize bottom-0 left-0 right-0 h-1 border-t border-gray-300",
          isResizing && "bg-blue-500",
          handleClassName || "hover:bg-blue-500/50"
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
