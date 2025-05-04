"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"
import { useSettingsStore } from "@/lib/settings-store"
import { cn } from "@/lib/utils"
import type { Annotation, ImageData, Point } from "@/lib/types"
import { useUIStore } from "@/lib/ui-store"
import { useCanvas } from "@/hooks/use-canvas"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { Crosshairs } from "@/components/canvas/crosshairs"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
}

export function Canvas({ image, annotations }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [movingLabelId, setMovingLabelId] = useState<string | null>(null)
  const [movingOffset, setMovingOffset] = useState<Point | null>(null)
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [tempLabel, setTempLabel] = useState<Partial<Annotation> | null>(null)

  const {
    isDragging,
    setIsDragging,
    startPoint,
    setStartPoint,
    currentPoint,
    setCurrentPoint,
    polygonPoints,
    setPolygonPoints,
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    lastPanPoint,
    setLastPanPoint,
  } = useCanvas()
  const { createAnnotation, updateAnnotation, deleteAnnotation } = useStore()
  const { setCreateAnnotationModal } = useUIStore()
  const { showCrosshairs, showCoordinates, selectedTool, zoom, setZoom } =
    useSettingsStore()

  const [uiZoom, setUiZoom] = useState(1)

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
        deleteAnnotation(selectedLabelId)
        setSelectedLabelId(null)
      }

      // Zoom shortcuts
      if (e.key === "=" || e.key === "+") {
        setUiZoom(Math.min(uiZoom + 0.1, 5))
      } else if (e.key === "-" || e.key === "_") {
        setUiZoom(Math.max(uiZoom - 0.1, 0.1))
      } else if (e.key === "0") {
        setUiZoom(1)
        setPanOffset({ x: 0, y: 0 })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedLabelId, deleteAnnotation])

  // Handle mouse down on canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - panOffset.x) / uiZoom
    const y = (e.clientY - rect.top - panOffset.y) / uiZoom

    // Check for resize handles first
    if (selectedLabelId && selectedTool === "move") {
      const annotation = annotations.find((l) => l.id === selectedLabelId)
      if (annotation && annotation.type === "box") {
        const handle = getResizeHandle(e, annotation)
        if (handle) {
          setIsResizing(true)
          setResizeHandle(handle)
          return
        }
      }
    }

    // Check if clicked on a label for selection or moving
    if (selectedTool === "move" && e.button === 0) {
      const clickedAnnotation = findLabelAtPoint({ x, y })

      if (clickedAnnotation) {
        setSelectedLabelId(clickedAnnotation.id)
        setMovingLabelId(clickedAnnotation.id)

        // Calculate offset from the top-left corner of the label
        if (clickedAnnotation.type === "box") {
          const [topLeft] = clickedAnnotation.coordinates
          setMovingOffset({
            x: x - topLeft.x,
            y: y - topLeft.y,
          })
        } else if (clickedAnnotation.type === "polygon") {
          // For polygon, we'll move the entire shape
          // Calculate the centroid as reference
          const centroid = calculatePolygonCentroid(
            clickedAnnotation.coordinates
          )
          setMovingOffset({
            x: x - centroid.x,
            y: y - centroid.y,
          })
        }
        return
      }

      // Start panning if not on a label and middle mouse button or space+left click
      if (e.button === 0 && e.altKey) {
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
        deleteAnnotation(labelToDelete.id)
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
      const label = annotations.find((l) => l.id === selectedLabelId)
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
          updateAnnotation(selectedLabelId, {
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
      const label = annotations.find((l) => l.id === movingLabelId)
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

          updateAnnotation(movingLabelId, {
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

          updateAnnotation(movingLabelId, {
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

  // Effect to prompt for label name when a shape is completed
  useEffect(() => {
    if (showLabelInput && tempLabel) {
      setCreateAnnotationModal({
        isOpen: true,
        onSubmit: handleAnnotationSubmit,
        onCancel: () => {
          setShowLabelInput(false)
          setTempLabel(null)
        },
      })
    }
  }, [showLabelInput, tempLabel, setCreateAnnotationModal, setShowLabelInput])

  const handleAnnotationSubmit = (name: string, color: string) => {
    if (tempLabel) {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        name: name,
        type: tempLabel.type as "box" | "polygon",
        coordinates: tempLabel.coordinates || [],
        imageId: image.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        color: color,
        isAIGenerated: false,
      }

      createAnnotation(newAnnotation)
      setTempLabel(null)
      setShowLabelInput(false)
    }
  }

  // Find a label at a specific point
  const findLabelAtPoint = (point: Point): Annotation | null => {
    // First check for selected label to prioritize it
    if (selectedLabelId) {
      const selectedLabel = annotations.find((a) => a.id === selectedLabelId)
      if (selectedLabel) {
        if (isPointInLabel(point, selectedLabel)) {
          return selectedLabel
        }
      }
    }

    // Then check other labels in reverse order (newest first)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i]
      if (isPointInLabel(point, annotation)) {
        return annotation
      }
    }

    return null
  }

  // Check if a point is inside a label
  const isPointInLabel = (point: Point, annotation: Annotation): boolean => {
    if (annotation.type === "box") {
      const [topLeft, bottomRight] = annotation.coordinates
      return (
        point.x >= topLeft.x &&
        point.x <= bottomRight.x &&
        point.y >= topLeft.y &&
        point.y <= bottomRight.y
      )
    } else if (annotation.type === "polygon") {
      return isPointInPolygon(point, annotation.coordinates)
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
    annotation: Annotation
  ): string | null => {
    if (annotation.type !== "box") return null

    const [topLeft, bottomRight] = annotation.coordinates
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    const x = (e.clientX - rect.left - panOffset.x) / uiZoom
    const y = (e.clientY - rect.top - panOffset.y) / uiZoom

    const handleSize = 8 / uiZoom // Size of the resize handle

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
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, uiZoom + delta))

      // Zoom centered on cursor position
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const beforeZoomX = (mouseX - panOffset.x) / uiZoom
        const beforeZoomY = (mouseY - panOffset.y) / uiZoom

        const afterZoomX = (mouseX - panOffset.x) / newZoom
        const afterZoomY = (mouseY - panOffset.y) / newZoom

        setPanOffset({
          x: panOffset.x - (afterZoomX - beforeZoomX) * newZoom,
          y: panOffset.y - (afterZoomY - beforeZoomY) * newZoom,
        })
      }

      setUiZoom(newZoom)
    }
  }

  const resetView = useCallback(() => {
    setUiZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const zoomIn = useCallback(() => {
    setUiZoom((prevZoom) => Math.min(prevZoom + 0.1, 5))
  }, [])

  const zoomOut = useCallback(() => {
    setUiZoom((prevZoom) => Math.max(prevZoom - 0.1, 0.1))
  }, [])

  useEffect(() => {
    window.addEventListener("reset-zoom", resetView)
    window.addEventListener("zoom-in", zoomIn)
    window.addEventListener("zoom-out", zoomOut)
    return () => {
      window.removeEventListener("reset-zoom", resetView)
      window.removeEventListener("zoom-in", zoomIn)
      window.removeEventListener("zoom-out", zoomOut)
    }
  }, [resetView, zoomIn, zoomOut])

  useEffect(() => {
    setZoom(uiZoom)
  }, [uiZoom])

  useEffect(() => {
    if (canvasRef.current && image) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const scaleX = canvasRect.width / image.width
      const scaleY = canvasRect.height / image.height
      const initialZoom = Math.min(scaleX, scaleY)

      setUiZoom(initialZoom)
      setPanOffset({ x: 0, y: 0 }) // Center the image
    }
  }, [image])

  const cursorStyles: Record<string, string> = {
    box: "cursor-crosshair",
    polygon: "cursor-crosshair",
    move: "cursor-move",
    delete: "cursor-pointer",
    pan: "cursor-grabbing",
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
            cursorStyles[selectedTool] || "cursor-default"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          role="button"
        >
          <div
            className="absolute"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${uiZoom})`,
              transformOrigin: "0 0",
              marginLeft: "0",
              marginTop: "0",
            }}
          >
            <img
              src={image.data || "/placeholder.svg"}
              alt="Canvas"
              className="pointer-events-none select-none"
              draggable={false}
              width={image.width}
              height={image.height}
            />

            {/* Render existing annotation */}
            <AnnotationRenderer
              annotations={annotations}
              selectedLabelId={selectedLabelId}
              selectedTool={selectedTool}
              uiZoom={uiZoom}
            />

            {/* Render current drawing */}
            {isDragging && startPoint && currentPoint && (
              <div
                className="absolute border-5 border-dashed border-blue-500 bg-opacity-10"
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
                    r={4 / uiZoom}
                    className="fill-white stroke-blue-500 stroke-2"
                  />
                ))}
              </svg>
            )}
          </div>

          <Crosshairs
            showCrosshairs={showCrosshairs}
            cursorPosition={cursorPosition}
            uiZoom={uiZoom}
            panOffset={panOffset}
          />
          <PositionCoordinates
            showCoordinates={showCoordinates}
            cursorPosition={cursorPosition}
            uiZoom={uiZoom}
            panOffset={panOffset}
          />
        </div>
      )}
    </div>
  )
}
