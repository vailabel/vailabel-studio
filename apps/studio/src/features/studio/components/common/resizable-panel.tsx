import { useState, useEffect, useRef, memo } from "react"
import { cn } from "@/shared/lib/utils"

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
  /** When set, the dragged size is remembered across sessions under this key. */
  storageKey?: string
}

export const ResizablePanel = memo(
  ({
    direction = "horizontal",
    controlPosition = direction === "horizontal" ? "right" : "bottom",
    defaultSize = 300,
    minSize = 200,
    maxSize = 600,
    className,
    handleClassName,
    children,
    onResize,
    storageKey,
  }: ResizablePanelProps) => {
    const [size, setSize] = useState<number>(() => {
      if (storageKey && typeof window !== "undefined") {
        const saved = Number(window.localStorage.getItem(storageKey))
        if (Number.isFinite(saved) && saved > 0) {
          return Math.max(minSize, Math.min(maxSize, saved))
        }
      }
      return defaultSize
    })
    const [isResizing, setIsResizing] = useState(false)
    const startPosRef = useRef(0)
    const startSizeRef = useRef(size)
    const latestSizeRef = useRef(size)
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
          controlPosition === "left" || controlPosition === "top"
            ? -delta
            : delta

        const newSize = Math.max(
          minSize,
          Math.min(maxSize, startSizeRef.current + adjustedDelta)
        )

        setSize(newSize)
        latestSizeRef.current = newSize
        if (onResize) onResize(newSize)
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        if (storageKey && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(storageKey, String(latestSizeRef.current))
          } catch {
            // Ignore storage failures (private mode / quota); resize still works.
          }
        }
      }

      if (isResizing) {
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }, [isResizing, minSize, maxSize, direction, controlPosition, onResize, storageKey])

    const handleClassMap: Record<string, string> = {
      left: "cursor-col-resize left-0 top-0 bottom-0 w-1 border-r border-input",
      right:
        "cursor-col-resize right-0 top-0 bottom-0 w-1 border-l border-input",
      top: "cursor-row-resize top-0 left-0 right-0 h-1 border-b border-input",
      bottom:
        "cursor-row-resize bottom-0 left-0 right-0 h-1 border-t border-input",
    }
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
            handleClassMap[controlPosition],
            isResizing && "bg-primary",
            handleClassName || "hover:bg-primary/50"
          )}
          onMouseDown={handleMouseDown}
        />
      </div>
    )
  }
)
