import { useCallback, useState, useEffect } from "react"
import type { Point, Annotation } from "@/lib/types"
import { useCanvas } from "@/contexts/canvas-context"
import { useAnnotations } from "@/hooks/use-annotations"
import { calculatePolygonCentroid, isPointInPolygon } from "@/lib/canvas-utils"

export function useCanvasHandlers(canvasRef: React.RefObject<HTMLDivElement>) {
  const {
    zoom,
    panOffset,
    selectedTool,
    setPanOffset,
    setCursorPosition,
    setSelectedTool,
  } = useCanvas()

  const {
    annotations,
    updateAnnotation,
    deleteAnnotation,
    currentImage,
    selectedAnnotation,
    setSelectedAnnotation,
  } = useAnnotations()

  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])

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
    [annotations, selectedAnnotation]
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
      }
      return false
    },
    []
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

      // Check for resize handles first
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

      // Check if clicked on a label for selection or moving
      if (selectedTool === "move" && e.button === 0) {
        const clickedAnnotation = findLabelAtPoint(point)

        if (clickedAnnotation) {
          setSelectedAnnotation(clickedAnnotation)
          setMovingLabelId(clickedAnnotation.id)

          // Calculate offset from the top-left corner of the label
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
              updatedAt: new Date(),
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
              updatedAt: new Date(),
            })
          } else if (annotation.type === "polygon") {
            // For polygon, move all points by the same delta
            const centroid = calculatePolygonCentroid(annotation.coordinates)
            const dx = point.x - centroid.x - movingOffset.x
            const dy = point.y - centroid.y - movingOffset.y

            const newCoordinates = annotation.coordinates.map((p) => ({
              x: p.x + dx,
              y: p.y + dy,
            }))

            updateAnnotation(movingLabelId, {
              ...annotation,
              coordinates: newCoordinates,
              updatedAt: new Date(),
            })
          }
        }
        return
      }

      // Handle drawing
      if (isDragging && startPoint) {
        setCurrentPoint(point)

        // Update tempAnnotation in real-time to show the dotted box on the UI
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
  }, [
    isPanning,
    isResizing,
    movingLabelId,
    isDragging,
    startPoint,
    currentPoint,
    currentImage,
    setTempAnnotation,
  ])

  const handleDoubleClick = useCallback(() => {
    if (selectedTool === "polygon" && polygonPoints.length >= 3) {
      setTempAnnotation({
        type: "polygon",
        coordinates: polygonPoints,
        imageId: currentImage?.id || "",
      })
      setShowLabelInput(true)
      setPolygonPoints([])
    }
  }, [selectedTool, polygonPoints, currentImage])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
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
      }
    },
    [zoom, panOffset, canvasRef, setPanOffset]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel operations with Escape
      if (e.key === "Escape") {
        setPolygonPoints([])
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

  // // Handle label creation modal
  // useEffect(() => {
  //   if (showLabelInput && tempAnnotation) {
  //     const name = prompt("Enter label name:")
  //     if (name) {
  //       const newAnnotation: Partial<Annotation> = {
  //         id: crypto.randomUUID(),
  //         name,
  //         type: tempAnnotation.type as "box" | "polygon",
  //         coordinates: tempAnnotation.coordinates || [],
  //         imageId: tempAnnotation.imageId || "",
  //         createdAt: new Date(),
  //         updatedAt: new Date(),
  //         color: "#3b82f6", // Default blue color
  //         isAIGenerated: false,
  //       }
  //       createAnnotation(newAnnotation)
  //     }
  //     setTempAnnotation(null)
  //     setShowLabelInput(false)
  //   }
  // }, [showLabelInput, tempAnnotation, createAnnotation])

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
