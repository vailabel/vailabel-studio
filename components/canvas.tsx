"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { useLabelStore } from "@/lib/store"
import { useSettingsStore } from "@/lib/settings-store"
import { cn } from "@/lib/utils"
import type { ImageData, Label, Point } from "@/lib/types"

interface CanvasProps {
  image: ImageData
  labels: Label[]
}

export function Canvas({ image, labels }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [movingLabelId, setMovingLabelId] = useState<string | null>(null)
  const [movingOffset, setMovingOffset] = useState<Point | null>(null)
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [tempLabel, setTempLabel] = useState<Partial<Label> | null>(null)

  const { addLabel, updateLabel, removeLabel, setLabelPrompt } = useLabelStore()

  const {
    showRulers,
    showCrosshairs,
    showCoordinates,
    selectedTool,
    darkMode,
  } = useSettingsStore()

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel operations with Escape
      if (e.key === "Escape") {
        setPolygonPoints([])
        setIsDragging(false)
        setStartPoint(null)
        setCurrentPoint(null)
        setSelectedLabelId(null)
        setIsResizing(false)
        setResizeHandle(null)
        setMovingLabelId(null)
        setMovingOffset(null)
      }

      // Delete selected label
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLabelId) {
        removeLabel(selectedLabelId)
        setSelectedLabelId(null)
      }

      // Zoom shortcuts
      if (e.key === "=" || e.key === "+") {
        setZoom((prev) => Math.min(prev + 0.1, 5))
      } else if (e.key === "-" || e.key === "_") {
        setZoom((prev) => Math.max(prev - 0.1, 0.1))
      } else if (e.key === "0") {
        setZoom(1)
        setPanOffset({ x: 0, y: 0 })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedLabelId, removeLabel])

  // Handle mouse down on canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - panOffset.x) / zoom
    const y = (e.clientY - rect.top - panOffset.y) / zoom

    // Check for resize handles first
    if (selectedLabelId && selectedTool === "move") {
      const label = labels.find((l) => l.id === selectedLabelId)
      if (label && label.type === "box") {
        const handle = getResizeHandle(e, label)
        if (handle) {
          setIsResizing(true)
          setResizeHandle(handle)
          return
        }
      }
    }

    // Check if clicked on a label for selection or moving
    if (selectedTool === "move" && e.button === 0) {
      const clickedLabel = findLabelAtPoint({ x, y })

      if (clickedLabel) {
        setSelectedLabelId(clickedLabel.id)
        setMovingLabelId(clickedLabel.id)

        // Calculate offset from the top-left corner of the label
        if (clickedLabel.type === "box") {
          const [topLeft] = clickedLabel.coordinates
          setMovingOffset({
            x: x - topLeft.x,
            y: y - topLeft.y,
          })
        } else if (clickedLabel.type === "polygon") {
          // For polygon, we'll move the entire shape
          // Calculate the centroid as reference
          const centroid = calculatePolygonCentroid(clickedLabel.coordinates)
          setMovingOffset({
            x: x - centroid.x,
            y: y - centroid.y,
          })
        }
        return
      }

      // Start panning if not on a label and middle mouse button or space+left click
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true)
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }
    }

    // Handle drawing tools
    if (selectedTool === "box") {
      setIsDragging(true)
      setStartPoint({ x, y })
      setCurrentPoint({ x, y })
    } else if (selectedTool === "polygon") {
      if (polygonPoints.length === 0) {
        // Start a new polygon
        setPolygonPoints([{ x, y }])
      } else {
        // Continue the polygon
        setPolygonPoints([...polygonPoints, { x, y }])
      }
    } else if (selectedTool === "delete") {
      const labelToDelete = findLabelAtPoint({ x, y })
      if (labelToDelete) {
        removeLabel(labelToDelete.id)
        setSelectedLabelId(null)
      }
    }
  }

  // Handle mouse move on canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - panOffset.x) / zoom
    const y = (e.clientY - rect.top - panOffset.y) / zoom

    // Update cursor position for crosshairs and coordinates
    setCursorPosition({ x, y })

    // Handle panning
    if (isPanning && lastPanPoint) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y
      setPanOffset({
        x: panOffset.x + dx,
        y: panOffset.y + dy,
      })
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    // Handle resizing
    if (isResizing && selectedLabelId && resizeHandle) {
      const label = labels.find((l) => l.id === selectedLabelId)
      if (label && label.type === "box") {
        const [topLeft, bottomRight] = [...label.coordinates]
        let newTopLeft = { ...topLeft }
        let newBottomRight = { ...bottomRight }

        switch (resizeHandle) {
          case "top-left":
            newTopLeft = { x, y }
            break
          case "top-right":
            newTopLeft = { ...newTopLeft, y }
            newBottomRight = { ...newBottomRight, x }
            break
          case "bottom-left":
            newTopLeft = { ...newTopLeft, x }
            newBottomRight = { ...newBottomRight, y }
            break
          case "bottom-right":
            newBottomRight = { x, y }
            break
          case "top":
            newTopLeft = { ...newTopLeft, y }
            break
          case "right":
            newBottomRight = { ...newBottomRight, x }
            break
          case "bottom":
            newBottomRight = { ...newBottomRight, y }
            break
          case "left":
            newTopLeft = { ...newTopLeft, x }
            break
        }

        // Ensure the box has positive width and height
        if (
          newBottomRight.x > newTopLeft.x &&
          newBottomRight.y > newTopLeft.y
        ) {
          updateLabel(selectedLabelId, {
            ...label,
            coordinates: [newTopLeft, newBottomRight],
            updatedAt: new Date(),
          })
        }
        return
      }
    }

    // Handle moving a label
    if (movingLabelId && movingOffset) {
      const label = labels.find((l) => l.id === movingLabelId)
      if (label) {
        if (label.type === "box") {
          const [topLeft, bottomRight] = label.coordinates
          const width = bottomRight.x - topLeft.x
          const height = bottomRight.y - topLeft.y

          const newTopLeft = {
            x: x - movingOffset.x,
            y: y - movingOffset.y,
          }

          const newBottomRight = {
            x: newTopLeft.x + width,
            y: newTopLeft.y + height,
          }

          updateLabel(movingLabelId, {
            ...label,
            coordinates: [newTopLeft, newBottomRight],
            updatedAt: new Date(),
          })
        } else if (label.type === "polygon") {
          // For polygon, move all points by the same delta
          const centroid = calculatePolygonCentroid(label.coordinates)
          const dx = x - centroid.x - movingOffset.x
          const dy = y - centroid.y - movingOffset.y

          const newCoordinates = label.coordinates.map((point) => ({
            x: point.x + dx,
            y: point.y + dy,
          }))

          updateLabel(movingLabelId, {
            ...label,
            coordinates: newCoordinates,
            updatedAt: new Date(),
          })
        }
      }
      return
    }

    // Handle drawing
    if (isDragging && startPoint) {
      setCurrentPoint({ x, y })
    }
  }

  // Handle mouse up on canvas
  const handleMouseUp = () => {
    // Handle panning
    if (isPanning) {
      setIsPanning(false)
      setLastPanPoint(null)
      return
    }

    // Handle resizing
    if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
      return
    }

    // Handle moving
    if (movingLabelId) {
      setMovingLabelId(null)
      setMovingOffset(null)
      return
    }

    // Handle drawing box
    if (isDragging && startPoint && currentPoint) {
      // Complete the box
      const coordinates = [
        {
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
        },
        {
          x: Math.max(startPoint.x, currentPoint.x),
          y: Math.max(startPoint.y, currentPoint.y),
        },
      ]

      // Only create a box if it has some size
      if (
        Math.abs(coordinates[1].x - coordinates[0].x) > 5 &&
        Math.abs(coordinates[1].y - coordinates[0].y) > 5
      ) {
        setTempLabel({
          type: "box",
          coordinates,
          imageId: image.id,
        })
        setShowLabelInput(true)
      }

      setIsDragging(false)
      setStartPoint(null)
      setCurrentPoint(null)
    }
  }

  // Handle double click to complete polygon
  const handleDoubleClick = () => {
    if (selectedTool === "polygon" && polygonPoints.length >= 3) {
      setTempLabel({
        type: "polygon",
        coordinates: polygonPoints,
        imageId: image.id,
      })
      setShowLabelInput(true)
      setPolygonPoints([])
    }
  }

  // Handle label input submission
  const handleLabelSubmit = (name: string, category: string, color: string) => {
    if (tempLabel) {
      const newLabel: Label = {
        id: `label-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name,
        category,
        color,
        type: tempLabel.type as "box" | "polygon",
        coordinates: tempLabel.coordinates || [],
        imageId: image.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Add label to store (which now also saves to database)
      addLabel(newLabel)
      setTempLabel(null)
      setShowLabelInput(false)
    }
  }

  // Find a label at a specific point
  const findLabelAtPoint = (point: Point): Label | null => {
    // First check for selected label to prioritize it
    if (selectedLabelId) {
      const selectedLabel = labels.find((l) => l.id === selectedLabelId)
      if (selectedLabel) {
        if (isPointInLabel(point, selectedLabel)) {
          return selectedLabel
        }
      }
    }

    // Then check other labels in reverse order (newest first)
    for (let i = labels.length - 1; i >= 0; i--) {
      const label = labels[i]
      if (isPointInLabel(point, label)) {
        return label
      }
    }

    return null
  }

  // Check if a point is inside a label
  const isPointInLabel = (point: Point, label: Label): boolean => {
    if (label.type === "box") {
      const [topLeft, bottomRight] = label.coordinates
      return (
        point.x >= topLeft.x &&
        point.x <= bottomRight.x &&
        point.y >= topLeft.y &&
        point.y <= bottomRight.y
      )
    } else if (label.type === "polygon") {
      return isPointInPolygon(point, label.coordinates)
    }
    return false
  }

  // Check if a point is inside a polygon
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y
      const xj = polygon[j].x,
        yj = polygon[j].y

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

      if (intersect) inside = !inside
    }
    return inside
  }

  // Calculate the centroid of a polygon
  const calculatePolygonCentroid = (points: Point[]): Point => {
    let sumX = 0
    let sumY = 0

    points.forEach((point) => {
      sumX += point.x
      sumY += point.y
    })

    return {
      x: sumX / points.length,
      y: sumY / points.length,
    }
  }

  // Get resize handle at mouse position
  const getResizeHandle = (
    e: React.MouseEvent,
    label: Label
  ): string | null => {
    if (label.type !== "box") return null

    const [topLeft, bottomRight] = label.coordinates
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    const x = (e.clientX - rect.left - panOffset.x) / zoom
    const y = (e.clientY - rect.top - panOffset.y) / zoom

    const handleSize = 8 / zoom // Size of the resize handle

    // Check each corner and edge
    if (
      Math.abs(x - topLeft.x) <= handleSize &&
      Math.abs(y - topLeft.y) <= handleSize
    ) {
      return "top-left"
    } else if (
      Math.abs(x - bottomRight.x) <= handleSize &&
      Math.abs(y - topLeft.y) <= handleSize
    ) {
      return "top-right"
    } else if (
      Math.abs(x - topLeft.x) <= handleSize &&
      Math.abs(y - bottomRight.y) <= handleSize
    ) {
      return "bottom-left"
    } else if (
      Math.abs(x - bottomRight.x) <= handleSize &&
      Math.abs(y - bottomRight.y) <= handleSize
    ) {
      return "bottom-right"
    } else if (
      Math.abs(y - topLeft.y) <= handleSize &&
      x > topLeft.x &&
      x < bottomRight.x
    ) {
      return "top"
    } else if (
      Math.abs(x - bottomRight.x) <= handleSize &&
      y > topLeft.y &&
      y < bottomRight.y
    ) {
      return "right"
    } else if (
      Math.abs(y - bottomRight.y) <= handleSize &&
      x > topLeft.x &&
      x < bottomRight.x
    ) {
      return "bottom"
    } else if (
      Math.abs(x - topLeft.x) <= handleSize &&
      y > topLeft.y &&
      y < bottomRight.y
    ) {
      return "left"
    }

    return null
  }

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

      // Zoom centered on cursor position
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const beforeZoomX = (mouseX - panOffset.x) / zoom
        const beforeZoomY = (mouseY - panOffset.y) / zoom

        const afterZoomX = (mouseX - panOffset.x) / newZoom
        const afterZoomY = (mouseY - panOffset.y) / newZoom

        setPanOffset({
          x: panOffset.x - (afterZoomX - beforeZoomX) * newZoom,
          y: panOffset.y - (afterZoomY - beforeZoomY) * newZoom,
        })
      }

      setZoom(newZoom)
    }
  }

  // Reset view
  const resetView = () => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    const handleResetCanvasView = () => {
      resetView()
    }

    window.addEventListener("reset-canvas-view", handleResetCanvasView)

    return () => {
      window.removeEventListener("reset-canvas-view", handleResetCanvasView)
    }
  }, [])

  // Draw rulers
  const drawRulers = () => {
    if (!showRulers || !cursorPosition) return null

    const rulerSize = 20
    const tickInterval = 50 // pixels
    const imageWidth = image.width * zoom
    const imageHeight = image.height * zoom

    return (
      <>
        {/* Horizontal ruler */}
        <div
          className="absolute top-0 left-0 h-5 border-b bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 z-10"
          style={{ width: `${imageWidth + rulerSize}px` }}
        >
          {Array.from({ length: Math.ceil(imageWidth / tickInterval) }).map(
            (_, i) => (
              <div
                key={`h-${i}`}
                className="absolute bottom-0 border-l h-2 border-gray-400 dark:border-gray-600"
                style={{ left: `${i * tickInterval + rulerSize}px` }}
              >
                <div className="absolute -left-3 -top-4 text-[10px] text-gray-600 dark:text-gray-400">
                  {i * tickInterval}
                </div>
              </div>
            )
          )}
          {cursorPosition && (
            <div
              className="absolute bottom-0 border-l border-red-500 h-full"
              style={{
                left: `${cursorPosition.x * zoom + panOffset.x + rulerSize}px`,
              }}
            />
          )}
        </div>

        {/* Vertical ruler */}
        <div
          className="absolute top-0 left-0 w-5 border-r bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 z-10"
          style={{ height: `${imageHeight + rulerSize}px` }}
        >
          {Array.from({ length: Math.ceil(imageHeight / tickInterval) }).map(
            (_, i) => (
              <div
                key={`v-${i}`}
                className="absolute right-0 border-t w-2 border-gray-400 dark:border-gray-600"
                style={{ top: `${i * tickInterval + rulerSize}px` }}
              >
                <div className="absolute -top-3 -left-4 text-[10px] rotate-90 origin-top-left text-gray-600 dark:text-gray-400">
                  {i * tickInterval}
                </div>
              </div>
            )
          )}
          {cursorPosition && (
            <div
              className="absolute right-0 border-t border-red-500 w-full"
              style={{
                top: `${cursorPosition.y * zoom + panOffset.y + rulerSize}px`,
              }}
            />
          )}
        </div>

        {/* Ruler corner */}
        <div className="absolute top-0 left-0 w-5 h-5 border-r border-b bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 z-20" />
      </>
    )
  }

  // Draw crosshairs
  const drawCrosshairs = () => {
    if (!showCrosshairs || !cursorPosition) return null

    return (
      <>
        <div
          className="absolute top-0 border-l border-blue-400 border-dashed pointer-events-none z-10"
          style={{
            left: `${cursorPosition.x * zoom + panOffset.x}px`,
            height: "100%",
          }}
        />
        <div
          className="absolute left-0 border-t border-blue-400 border-dashed pointer-events-none z-10"
          style={{
            top: `${cursorPosition.y * zoom + panOffset.y}px`,
            width: "100%",
          }}
        />
      </>
    )
  }

  // Show coordinates
  const showPositionCoordinates = () => {
    if (!showCoordinates || !cursorPosition) return null

    return (
      <div
        className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs pointer-events-none z-20"
        style={{
          left: `${cursorPosition.x * zoom + panOffset.x + 10}px`,
          top: `${cursorPosition.y * zoom + panOffset.y + 10}px`,
        }}
      >
        x: {Math.round(cursorPosition.x)}, y: {Math.round(cursorPosition.y)}
      </div>
    )
  }

  // Effect to prompt for label name when a shape is completed
  useEffect(() => {
    if (showLabelInput && tempLabel) {
      setLabelPrompt({
        isOpen: true,
        onSubmit: handleLabelSubmit,
        onCancel: () => {
          setShowLabelInput(false)
          setTempLabel(null)
        },
      })
    }
  }, [showLabelInput, tempLabel, setLabelPrompt])

  // Get color class for a label
  const getLabelColorClass = (label: Label) => {
    return label.color || "blue-500"
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900"
      onWheel={handleWheel}
    >
      {!image ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-500 dark:text-gray-300">
              No image loaded
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-400">
              Select an image to start labeling
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={canvasRef}
          className={cn(
            "relative h-full w-full overflow-hidden",
            selectedTool === "box" || selectedTool === "polygon"
              ? "cursor-crosshair"
              : selectedTool === "move"
                ? "cursor-move"
                : selectedTool === "delete"
                  ? "cursor-pointer"
                  : "cursor-default"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {drawRulers()}

          <div
            className="absolute"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              marginLeft: showRulers ? "20px" : "0",
              marginTop: showRulers ? "20px" : "0",
            }}
          >
            <img
              src={image.data || "/placeholder.svg"}
              alt="Canvas"
              className="pointer-events-none"
              draggable={false}
              width={image.width}
              height={image.height}
            />

            {/* Render existing labels */}
            {labels.map((label) => (
              <div key={label.id}>
                {label.type === "box" && (
                  <motion.div
                    className={cn(
                      "absolute border-2 bg-opacity-20",
                      selectedLabelId === label.id
                        ? "border-yellow-500 bg-yellow-500"
                        : label.isAIGenerated
                          ? "border-green-500 bg-green-500"
                          : `border-${label.color || "blue-500"} bg-${label.color || "blue-500"}`
                    )}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      left: label.coordinates[0].x,
                      top: label.coordinates[0].y,
                      width: label.coordinates[1].x - label.coordinates[0].x,
                      height: label.coordinates[1].y - label.coordinates[0].y,
                    }}
                  >
                    <div
                      className={cn(
                        "absolute -top-6 left-0 px-2 py-0.5 text-xs text-white",
                        selectedLabelId === label.id
                          ? "bg-yellow-500"
                          : label.isAIGenerated
                            ? "bg-green-500"
                            : `bg-${label.color || "blue-500"}`
                      )}
                    >
                      {label.name} {label.category && `(${label.category})`}
                      {label.isAIGenerated && " 🤖"}
                    </div>

                    {/* Render resize handles when selected */}
                    {selectedLabelId === label.id &&
                      selectedTool === "move" && (
                        <>
                          <div className="absolute -top-1 -left-1 h-2 w-2 cursor-nwse-resize bg-white border border-gray-400" />
                          <div className="absolute -top-1 -right-1 h-2 w-2 cursor-nesw-resize bg-white border border-gray-400" />
                          <div className="absolute -bottom-1 -left-1 h-2 w-2 cursor-nesw-resize bg-white border border-gray-400" />
                          <div className="absolute -bottom-1 -right-1 h-2 w-2 cursor-nwse-resize bg-white border border-gray-400" />
                          <div className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 cursor-ew-resize bg-white border border-gray-400" />
                          <div className="absolute top-1/2 -right-1 h-2 w-2 -translate-y-1/2 cursor-ew-resize bg-white border border-gray-400" />
                          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 cursor-ns-resize bg-white border border-gray-400" />
                          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 cursor-ns-resize bg-white border border-gray-400" />
                        </>
                      )}
                  </motion.div>
                )}

                {label.type === "polygon" && (
                  <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
                    <motion.polygon
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      points={label.coordinates
                        .map((p) => `${p.x},${p.y}`)
                        .join(" ")}
                      className={cn(
                        "fill-opacity-20 stroke-2",
                        selectedLabelId === label.id
                          ? "fill-yellow-500 stroke-yellow-500"
                          : label.isAIGenerated
                            ? "fill-green-500 stroke-green-500"
                            : `fill-${label.color || "blue-500"} stroke-${label.color || "blue-500"}`
                      )}
                    />
                    <text
                      x={label.coordinates[0].x}
                      y={label.coordinates[0].y - 10}
                      className={cn(
                        "text-xs",
                        selectedLabelId === label.id
                          ? "fill-yellow-500"
                          : label.isAIGenerated
                            ? "fill-green-500"
                            : `fill-${label.color || "blue-500"}`
                      )}
                    >
                      {label.name} {label.category && `(${label.category})`}
                    </text>

                    {/* Render vertices when selected */}
                    {selectedLabelId === label.id &&
                      selectedTool === "move" && (
                        <>
                          {label.coordinates.map((point, index) => (
                            <circle
                              key={index}
                              cx={point.x}
                              cy={point.y}
                              r={4 / zoom}
                              className="fill-white stroke-gray-400 stroke-1"
                            />
                          ))}
                        </>
                      )}
                  </svg>
                )}
              </div>
            ))}

            {/* Render current drawing */}
            {isDragging && startPoint && currentPoint && (
              <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-10"
                style={{
                  left: Math.min(startPoint.x, currentPoint.x),
                  top: Math.min(startPoint.y, currentPoint.y),
                  width: Math.abs(currentPoint.x - startPoint.x),
                  height: Math.abs(currentPoint.y - startPoint.y),
                }}
              />
            )}

            {/* Render polygon in progress */}
            {polygonPoints.length > 0 && (
              <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
                <polyline
                  points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  className="fill-none stroke-blue-500 stroke-2 stroke-dashed"
                />
                {polygonPoints.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={4 / zoom}
                    className="fill-white stroke-blue-500 stroke-2"
                  />
                ))}
              </svg>
            )}
          </div>

          {drawCrosshairs()}
          {showPositionCoordinates()}
        </div>
      )}
    </div>
  )
}
