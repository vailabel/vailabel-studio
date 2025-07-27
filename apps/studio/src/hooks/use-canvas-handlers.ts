import { useCallback, useState, useEffect } from "react"
import type { Point, Annotation } from "@vailabel/core"
import { calculatePolygonCentroid, isPointInPolygon } from "@/lib/canvas-utils"
import { useCanvasStore } from "../stores/canvas-store"
import { useAnnotationsStore } from "../stores/annotation-store"

export function useCanvasHandlers() {
  const {
    zoom,
    panOffset,
    selectedTool,
    setPanOffset,
    setCursorPosition,
    setSelectedTool,
    setZoom,
  } = useCanvasStore()

  const { canvasRef } = useCanvasStore()

  const { annotations, updateAnnotation, deleteAnnotation, currentImage } =
    useAnnotationsStore()
  const { selectedAnnotation, setSelectedAnnotation } = useCanvasStore()
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [freeDrawPoints, setFreeDrawPoints] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [movingLabelId, setMovingLabelId] = useState<string | null>(null)
  const [movingOffset, setMovingOffset] = useState<Point | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)
  const [tempAnnotation, setTempAnnotation] =
    useState<Partial<Annotation> | null>(null)

  const [showLabelInput, setShowLabelInput] = useState(false)

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (clientX - rect.left - panOffset.x) / zoom,
        y: (clientY - rect.top - panOffset.y) / zoom,
      }
    },
    [canvasRef, panOffset, zoom]
  )

  const isPointInLabel = useCallback(
    (point: Point, annotation: Annotation): boolean => {
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
      } else if (annotation.type === "freeDraw") {
        // For freeDraw, check if point is near any line segment of the path
        const threshold = 5 / (window.devicePixelRatio || 1) // Adjust threshold based on device pixel ratio

        for (let i = 0; i < annotation.coordinates.length - 1; i++) {
          const p1 = annotation.coordinates[i]
          const p2 = annotation.coordinates[i + 1]

          // Calculate distance from point to line segment
          const A = point.x - p1.x
          const B = point.y - p1.y
          const C = p2.x - p1.x
          const D = p2.y - p1.y

          const dot = A * C + B * D
          const lenSq = C * C + D * D

          let param = -1
          if (lenSq !== 0) {
            param = dot / lenSq
          }

          let xx, yy
          if (param < 0) {
            xx = p1.x
            yy = p1.y
          } else if (param > 1) {
            xx = p2.x
            yy = p2.y
          } else {
            xx = p1.x + param * C
            yy = p1.y + param * D
          }

          const dx = point.x - xx
          const dy = point.y - yy
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance <= threshold) {
            return true
          }
        }
        return false
      }
      return false
    },
    []
  )

  const findLabelAtPoint = useCallback(
    (point: Point): Annotation | null => {
      // First check for selected label to prioritize it
      if (selectedAnnotation) {
        const selectedLabel = annotations.find(
          (a) => a.id === selectedAnnotation.id
        )
        if (selectedLabel && isPointInLabel(point, selectedLabel)) {
          return selectedLabel
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
    },
    [annotations, selectedAnnotation, isPointInLabel]
  )

  const getResizeHandle = useCallback(
    (e: React.MouseEvent, annotation: Annotation): string | null => {
      if (annotation.type !== "box") return null

      const [topLeft, bottomRight] = annotation.coordinates
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
    },
    [zoom, panOffset, canvasRef]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return
      const point = getCanvasCoords(e.clientX, e.clientY)

      // Always check if we clicked on an annotation first (for selection)
      const clickedAnnotation = findLabelAtPoint(point)

      // Check for resize handles first (only in move mode)
      if (selectedAnnotation && selectedTool === "move") {
        const annotation = annotations.find(
          (l) => l.id === selectedAnnotation.id
        )
        if (annotation && annotation.type === "box") {
          const handle = getResizeHandle(e, annotation)
          if (handle) {
            setIsResizing(true)
            setResizeHandle(handle)
            return
          }
        }
      }

      // Handle annotation selection and moving (in move mode)
      if (selectedTool === "move" && e.button === 0) {
        if (clickedAnnotation) {
          setSelectedAnnotation(clickedAnnotation)
          setMovingLabelId(clickedAnnotation.id)

          // Calculate offset from the appropriate reference point
          if (clickedAnnotation.type === "box") {
            const [topLeft] = clickedAnnotation.coordinates
            setMovingOffset({
              x: point.x - topLeft.x,
              y: point.y - topLeft.y,
            })
          } else if (clickedAnnotation.type === "polygon") {
            // For polygon, we'll move the entire shape
            const centroid = calculatePolygonCentroid(
              clickedAnnotation.coordinates
            )
            setMovingOffset({
              x: point.x - centroid.x,
              y: point.y - centroid.y,
            })
          } else if (clickedAnnotation.type === "freeDraw") {
            // For freeDraw, use the first point as reference
            const firstPoint = clickedAnnotation.coordinates[0]
            setMovingOffset({
              x: point.x - firstPoint.x,
              y: point.y - firstPoint.y,
            })
          }
          return
        } else {
          // Deselect if clicking on empty area in move mode
          setSelectedAnnotation(null)
        }

        // Start panning if not on a label and alt+click
        if (e.button === 0 && e.altKey) {
          setIsPanning(true)
          setLastPanPoint({ x: e.clientX, y: e.clientY })
          return
        }
      } else if (clickedAnnotation) {
        // Select annotation even when not in move mode (for visual feedback)
        setSelectedAnnotation(clickedAnnotation)
      } else {
        // Deselect when clicking empty area
        setSelectedAnnotation(null)
      }

      // Handle drawing tools
      if (selectedTool === "box") {
        setIsDragging(true)
        setStartPoint(point)
        setCurrentPoint(point)
      } else if (selectedTool === "polygon") {
        if (polygonPoints.length === 0) {
          // Start a new polygon
          setPolygonPoints([point])
        } else {
          // Continue the polygon
          setPolygonPoints([...polygonPoints, point])
        }
      } else if (selectedTool === "freeDraw") {
        setIsDrawing(true)
        setFreeDrawPoints([point])
        setTempAnnotation({
          type: "freeDraw",
          coordinates: [point],
          imageId: currentImage?.id || "",
          color: "#3b82f6", // Default blue color for the new annotation
        })
      } else if (selectedTool === "delete") {
        const labelToDelete = findLabelAtPoint(point)
        if (labelToDelete) {
          deleteAnnotation(labelToDelete.id)
          setSelectedAnnotation(null)
        }
      }
    },
    [
      canvasRef,
      getCanvasCoords,
      selectedAnnotation,
      selectedTool,
      annotations,
      getResizeHandle,
      findLabelAtPoint,
      setSelectedAnnotation,
      polygonPoints,
      deleteAnnotation,
      currentImage?.id,
    ]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return

      const point = getCanvasCoords(e.clientX, e.clientY)
      setCursorPosition(point)

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
      if (isResizing && selectedAnnotation && resizeHandle) {
        const annotation = annotations.find(
          (l) => l.id === selectedAnnotation.id
        )
        if (annotation && annotation.type === "box") {
          const [topLeft, bottomRight] = [...annotation.coordinates]
          let newTopLeft = { ...topLeft }
          let newBottomRight = { ...bottomRight }

          switch (resizeHandle) {
            case "top-left":
              newTopLeft = point
              break
            case "top-right":
              newTopLeft = { ...newTopLeft, y: point.y }
              newBottomRight = { ...newBottomRight, x: point.x }
              break
            case "bottom-left":
              newTopLeft = { ...newTopLeft, x: point.x }
              newBottomRight = { ...newBottomRight, y: point.y }
              break
            case "bottom-right":
              newBottomRight = point
              break
            case "top":
              newTopLeft = { ...newTopLeft, y: point.y }
              break
            case "right":
              newBottomRight = { ...newBottomRight, x: point.x }
              break
            case "bottom":
              newBottomRight = { ...newBottomRight, y: point.y }
              break
            case "left":
              newTopLeft = { ...newTopLeft, x: point.x }
              break
          }

          // Ensure the box has positive width and height
          if (
            newBottomRight.x > newTopLeft.x &&
            newBottomRight.y > newTopLeft.y
          ) {
            updateAnnotation(selectedAnnotation.id, {
              ...annotation,
              coordinates: [newTopLeft, newBottomRight],
            })
          }
          return
        }
      }

      // Handle moving a label
      if (movingLabelId && movingOffset) {
        const annotation = annotations.find((l) => l.id === movingLabelId)
        if (annotation) {
          if (annotation.type === "box") {
            const [topLeft, bottomRight] = annotation.coordinates
            const width = bottomRight.x - topLeft.x
            const height = bottomRight.y - topLeft.y

            const newTopLeft = {
              x: point.x - movingOffset.x,
              y: point.y - movingOffset.y,
            }

            const newBottomRight = {
              x: newTopLeft.x + width,
              y: newTopLeft.y + height,
            }

            updateAnnotation(movingLabelId, {
              ...annotation,
              coordinates: [newTopLeft, newBottomRight],
            })
          } else if (annotation.type === "polygon") {
            // For polygon, move all points by the same delta
            const centroid = calculatePolygonCentroid(annotation.coordinates)
            const dx = point.x - movingOffset.x - centroid.x
            const dy = point.y - movingOffset.y - centroid.y

            const newCoordinates = annotation.coordinates.map((p) => ({
              x: p.x + dx,
              y: p.y + dy,
            }))

            updateAnnotation(movingLabelId, {
              ...annotation,
              coordinates: newCoordinates,
            })
          } else if (annotation.type === "freeDraw") {
            // For freeDraw, move all points by the same delta
            const firstPoint = annotation.coordinates[0]
            const dx = point.x - movingOffset.x - firstPoint.x
            const dy = point.y - movingOffset.y - firstPoint.y

            const newCoordinates = annotation.coordinates.map((p) => ({
              x: p.x + dx,
              y: p.y + dy,
            }))

            updateAnnotation(movingLabelId, {
              ...annotation,
              coordinates: newCoordinates,
            })
          }
        }
        return
      }

      // Handle drawing
      if (isDragging && startPoint) {
        setCurrentPoint(point)
        const coordinates = [
          {
            x: Math.min(startPoint.x, point.x),
            y: Math.min(startPoint.y, point.y),
          },
          {
            x: Math.max(startPoint.x, point.x),
            y: Math.max(startPoint.y, point.y),
          },
        ]

        setTempAnnotation({
          type: "box",
          coordinates,
          imageId: currentImage?.id || "",
          color: "#3b82f6", // Default blue color for the new annotation
        })
      }

      // Handle free drawing
      if (isDrawing) {
        // Add point only if it's far enough from the last point to avoid too many points
        const lastPoint = freeDrawPoints[freeDrawPoints.length - 1]
        const distance = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) +
            Math.pow(point.y - lastPoint.y, 2)
        )

        if (distance > 2) {
          // Minimum distance threshold
          const newPoints = [...freeDrawPoints, point]
          setFreeDrawPoints(newPoints)
          setTempAnnotation({
            type: "freeDraw",
            coordinates: newPoints,
            imageId: currentImage?.id || "",
            color: "#3b82f6", // Default blue color for the new annotation
          })
        }
      }
    },
    [
      canvasRef,
      getCanvasCoords,
      setCursorPosition,
      isPanning,
      lastPanPoint,
      isResizing,
      selectedAnnotation,
      resizeHandle,
      movingLabelId,
      movingOffset,
      isDragging,
      startPoint,
      setPanOffset,
      panOffset.x,
      panOffset.y,
      annotations,
      updateAnnotation,
      currentImage?.id,
      isDrawing,
      freeDrawPoints,
    ]
  )

  const handleMouseUp = useCallback(() => {
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
        setTempAnnotation({
          type: "box",
          coordinates,
          imageId: currentImage?.id || "",
        })
        setShowLabelInput(true)
      }

      setIsDragging(false)
      setStartPoint(null)
      setCurrentPoint(null)
    }

    // Handle free drawing
    if (isDrawing && freeDrawPoints.length > 3) {
      // Require at least 4 points
      setTempAnnotation({
        type: "freeDraw",
        coordinates: freeDrawPoints,
        imageId: currentImage?.id || "",
      })
      setShowLabelInput(true)
      setIsDrawing(false)
      setFreeDrawPoints([])
    }
  }, [
    isPanning,
    isResizing,
    movingLabelId,
    isDragging,
    startPoint,
    currentPoint,
    currentImage,
    setTempAnnotation,
    isDrawing,
    freeDrawPoints,
  ])

  const handleDoubleClick = useCallback(() => {
    if (selectedTool === "polygon" && polygonPoints.length >= 3) {
      setTempAnnotation({
        type: "polygon",
        coordinates: polygonPoints,
        imageId: currentImage?.id,
      })
      setShowLabelInput(true)
      setPolygonPoints([])
    }
  }, [selectedTool, polygonPoints, currentImage])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // e.preventDefault() // Prevent default scrolling behavior
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top

          const beforeZoomX = (mouseX - panOffset.x) / zoom
          const beforeZoomY = (mouseY - panOffset.y) / zoom

          const afterZoomX = (mouseX - panOffset.x) / newZoom
          const afterZoomY = (mouseY - panOffset.y) / newZoom

          setPanOffset({
            x: panOffset.x + (beforeZoomX - afterZoomX) * newZoom,
            y: panOffset.y + (beforeZoomY - afterZoomY) * newZoom,
          })
        }

        // Update the zoom level using the appropriate method
        setZoom(newZoom)
      }
    },
    [zoom, panOffset, canvasRef, setPanOffset, setZoom]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel operations with Escape
      if (e.key === "Escape") {
        setPolygonPoints([])
        setFreeDrawPoints([])
        setIsDrawing(false)
        setIsDragging(false)
        setStartPoint(null)
        setCurrentPoint(null)
        setSelectedAnnotation(null)
        setIsResizing(false)
        setResizeHandle(null)
        setMovingLabelId(null)
        setMovingOffset(null)
      }

      // Delete selected label
      if ((e.key === "Delete" || e.key === "Backspace") && selectedAnnotation) {
        deleteAnnotation(selectedAnnotation.id)
        setSelectedAnnotation(null)
      }

      // Tool shortcuts
      if (e.key === "v") setSelectedTool("move")
      if (e.key === "b") setSelectedTool("box")
      if (e.key === "p") setSelectedTool("polygon")
      if (e.key === "f") setSelectedTool("freeDraw")
      if (e.key === "d") setSelectedTool("delete")
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    selectedAnnotation,
    deleteAnnotation,
    setSelectedTool,
    setSelectedAnnotation,
  ])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
    isDragging,
    startPoint,
    isPanning,
    isResizing,
    resizeHandle,
    currentPoint,
    polygonPoints,
    selectedAnnotation,
    setSelectedAnnotation,
    tempAnnotation,
    setTempAnnotation,
    showLabelInput,
    setShowLabelInput,
  }
}
