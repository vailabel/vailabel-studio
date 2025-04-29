"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ResizablePanelProps {
  direction: "horizontal" | "vertical"
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
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta))

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
  }, [isResizing, minSize, maxSize, direction, onResize])

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
          "absolute z-10 cursor-col-resize",
          direction === "horizontal" ? "top-0 bottom-0 w-1 -left-0.5" : "left-0 right-0 h-1 -top-0.5",
          isResizing && "bg-blue-500",
          handleClassName || "hover:bg-blue-500/50",
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
