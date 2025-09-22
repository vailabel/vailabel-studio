import type { Point, Annotation } from "@vailabel/core"

export function getCanvasCoords(
  container: HTMLDivElement | null,
  panOffset: Point,
  zoom: number,
  clientX: number,
  clientY: number
): Point {
  if (!container) return { x: 0, y: 0 }

  const rect = container.getBoundingClientRect()
  return {
    x: (clientX - rect.left - panOffset.x) / zoom,
    y: (clientY - rect.top - panOffset.y) / zoom,
  }
}

// Get image coordinates without applying pan/zoom transformations
// This ensures annotations maintain their absolute positions relative to the image
export function getImageCoords(
  container: HTMLDivElement | null,
  clientX: number,
  clientY: number
): Point {
  if (!container) return { x: 0, y: 0 }

  const rect = container.getBoundingClientRect()
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

// Cache for bounding boxes to avoid recalculation
const boundingBoxCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>()

export function isPointInLabel(point: Point, annotation: Annotation): boolean {
  if (!annotation.coordinates || annotation.coordinates.length === 0) {
    return false
  }

  if (annotation.type === "box" && annotation.coordinates.length >= 2) {
    const [topLeft, bottomRight] = annotation.coordinates
    return (
      point.x >= topLeft.x &&
      point.x <= bottomRight.x &&
      point.y >= topLeft.y &&
      point.y <= bottomRight.y
    )
  }

  if (annotation.type === "polygon") {
    // Use bounding box check first for early exit
    const cacheKey = `${annotation.id}-bbox`
    let bbox = boundingBoxCache.get(cacheKey)
    
    if (!bbox) {
      const coords = annotation.coordinates
      bbox = {
        minX: Math.min(...coords.map(p => p.x)),
        minY: Math.min(...coords.map(p => p.y)),
        maxX: Math.max(...coords.map(p => p.x)),
        maxY: Math.max(...coords.map(p => p.y))
      }
      boundingBoxCache.set(cacheKey, bbox)
    }
    
    // Early exit if point is outside bounding box
    if (point.x < bbox.minX || point.x > bbox.maxX || 
        point.y < bbox.minY || point.y > bbox.maxY) {
      return false
    }
    
    return isPointInPolygon(point, annotation.coordinates)
  }

  if (annotation.type === "freeDraw") {
    const threshold = 5
    const thresholdSquared = threshold * threshold // 25

    // Use bounding box check first for freeDraw as well
    const cacheKey = `${annotation.id}-freedraw-bbox`
    let bbox = boundingBoxCache.get(cacheKey)
    
    if (!bbox) {
      const coords = annotation.coordinates
      bbox = {
        minX: Math.min(...coords.map(p => p.x)) - threshold,
        minY: Math.min(...coords.map(p => p.y)) - threshold,
        maxX: Math.max(...coords.map(p => p.x)) + threshold,
        maxY: Math.max(...coords.map(p => p.y)) + threshold
      }
      boundingBoxCache.set(cacheKey, bbox)
    }
    
    // Early exit if point is outside bounding box
    if (point.x < bbox.minX || point.x > bbox.maxX || 
        point.y < bbox.minY || point.y > bbox.maxY) {
      return false
    }

    for (let i = 0; i < annotation.coordinates.length - 1; i++) {
      const p1 = annotation.coordinates[i]
      const p2 = annotation.coordinates[i + 1]

      const A = point.x - p1.x
      const B = point.y - p1.y
      const C = p2.x - p1.x
      const D = p2.y - p1.y

      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1

      if (lenSq !== 0) param = dot / lenSq

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
      // Use squared distance to avoid Math.sqrt
      const distanceSquared = dx * dx + dy * dy

      if (distanceSquared <= thresholdSquared) return true
    }
  }

  return false
}

// Function to clear cache when annotations change
export function clearBoundingBoxCache(annotationId?: string) {
  if (annotationId) {
    boundingBoxCache.delete(`${annotationId}-bbox`)
    boundingBoxCache.delete(`${annotationId}-freedraw-bbox`)
  } else {
    boundingBoxCache.clear()
  }
}

export function findLabelAtPoint(
  point: Point,
  annotations: Annotation[],
  selectedAnnotation: Annotation | null,
  isPointInLabelFn: (point: Point, annotation: Annotation) => boolean
): Annotation | null {
  // Early return if no annotations
  if (!annotations.length) return null

  // Check selected annotation first for better UX
  if (selectedAnnotation) {
    const selected = annotations.find((a) => a.id === selectedAnnotation.id)
    if (selected && isPointInLabelFn(point, selected)) {
      return selected
    }
  }

  // Iterate in reverse order (top to bottom) for better hit detection
  // Stop on first match for performance
  for (let i = annotations.length - 1; i >= 0; i--) {
    const annotation = annotations[i]
    if (
      annotation !== selectedAnnotation &&
      isPointInLabelFn(point, annotation)
    ) {
      return annotation
    }
  }

  return null
}

export function getResizeHandle(
  e: React.MouseEvent,
  annotation: Annotation,
  container: HTMLDivElement | null,
  zoom: number
): string | null {
  if (!container) return null

  const point = getImageCoords(
    container,
    e.clientX,
    e.clientY
  )

  const handleSize = Math.max(8 / zoom, 4) // Ensure minimum handle size of 4 pixels

  // Handle box annotations
  if (annotation.type === "box") {
    return getBoxResizeHandle(annotation, point, handleSize)
  }

  // Handle polygon and free draw annotations
  if (annotation.type === "polygon" || annotation.type === "freeDraw") {
    return getVertexResizeHandle(annotation, point, handleSize)
  }

  return null
}

function getBoxResizeHandle(
  annotation: Annotation,
  point: Point,
  handleSize: number
): string | null {
  // Validate coordinates structure
  if (!annotation.coordinates || annotation.coordinates.length !== 2) {
    console.warn(
      "getBoxResizeHandle: Invalid coordinates structure for box annotation",
      annotation
    )
    return null
  }

  const [topLeft, bottomRight] = annotation.coordinates

  // Validate coordinate objects
  if (
    !topLeft ||
    !bottomRight ||
    typeof topLeft.x !== "number" ||
    typeof topLeft.y !== "number" ||
    typeof bottomRight.x !== "number" ||
    typeof bottomRight.y !== "number"
  ) {
    console.warn("getBoxResizeHandle: Invalid coordinate values", {
      topLeft,
      bottomRight,
    })
    return null
  }

  const handles = [
    { name: "top-left", x: topLeft.x, y: topLeft.y },
    { name: "top-right", x: bottomRight.x, y: topLeft.y },
    { name: "bottom-left", x: topLeft.x, y: bottomRight.y },
    { name: "bottom-right", x: bottomRight.x, y: bottomRight.y },
    { name: "top", x: (topLeft.x + bottomRight.x) / 2, y: topLeft.y },
    { name: "right", x: bottomRight.x, y: (topLeft.y + bottomRight.y) / 2 },
    { name: "bottom", x: (topLeft.x + bottomRight.x) / 2, y: bottomRight.y },
    { name: "left", x: topLeft.x, y: (topLeft.y + bottomRight.y) / 2 },
  ]

  for (const handle of handles) {
    const dx = Math.abs(point.x - handle.x)
    const dy = Math.abs(point.y - handle.y)

    // Early exit for box-based detection to improve performance
    if (dx <= handleSize && dy <= handleSize) {
      return handle.name
    }
  }

  return null
}

function getVertexResizeHandle(
  annotation: Annotation,
  point: Point,
  handleSize: number
): string | null {
  // Validate coordinates structure
  if (!annotation.coordinates || annotation.coordinates.length === 0) {
    console.warn(
      "getVertexResizeHandle: Invalid coordinates structure for polygon/freeDraw annotation",
      annotation
    )
    return null
  }

  // Check each vertex to see if the mouse is close to it
  for (let i = 0; i < annotation.coordinates.length; i++) {
    const vertex = annotation.coordinates[i]
    
    if (!vertex || typeof vertex.x !== "number" || typeof vertex.y !== "number") {
      console.warn("getVertexResizeHandle: Invalid vertex", { vertex, index: i })
      continue
    }

    const dx = Math.abs(point.x - vertex.x)
    const dy = Math.abs(point.y - vertex.y)

    if (dx <= handleSize && dy <= handleSize) {
      return `vertex-${i}`
    }
  }

  return null
}

export function calculatePolygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }

  let area = 0
  let centroidX = 0
  let centroidY = 0

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    const xi = points[i].x
    const yi = points[i].y
    const xj = points[j].x
    const yj = points[j].y

    const cross = xi * yj - xj * yi
    area += cross
    centroidX += (xi + xj) * cross
    centroidY += (yi + yj) * cross
  }

  area /= 2
  const factor = 1 / (6 * area)

  centroidX *= factor
  centroidY *= factor

  return { x: centroidX, y: centroidY }
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false

  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}
