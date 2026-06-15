import type { Point, Annotation } from "@/types/core"

/**
 * Remove consecutive points closer than `minDistance` (image-space units).
 * Used when finishing a polygon/linestrip so the two near-identical points a
 * double-click adds don't survive as duplicate vertices.
 */
export function dedupeConsecutivePoints(
  points: Point[],
  minDistance: number
): Point[] {
  const out: Point[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) > minDistance) {
      out.push(point)
    }
  }
  return out
}

export function getCanvasCoords(
  container: HTMLDivElement | null,
  baseOffset: Point,
  zoom: number,
  clientX: number,
  clientY: number
): Point {
  if (!container) return { x: 0, y: 0 }

  const rect = container.getBoundingClientRect()
  return {
    x: (clientX - rect.left - baseOffset.x) / zoom,
    y: (clientY - rect.top - baseOffset.y) / zoom,
  }
}

export function getCenterOffset(
  container: { width: number; height: number },
  image: { width: number; height: number },
  zoom: number
): Point {
  const scaledWidth = image.width * zoom
  const scaledHeight = image.height * zoom
  return {
    x: (container.width - scaledWidth) / 2,
    y: (container.height - scaledHeight) / 2,
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

// Cache for bounding boxes to avoid recalculation. The cached box is tagged
// with the exact `coordinates` array it was computed from; since annotation
// updates always replace the array (immutable updates), a reference mismatch
// means the shape moved/resized and the box is recomputed automatically. This
// removes a whole class of stale-hit-test bugs (clicking a moved polygon used
// to miss because the old bounding box lingered).
type CachedBBox = {
  coords: Point[]
  box: { minX: number; minY: number; maxX: number; maxY: number }
}
const boundingBoxCache = new Map<string, CachedBBox>()

function getBoundingBox(
  cacheKey: string,
  coords: Point[],
  padding = 0
): CachedBBox["box"] {
  const cached = boundingBoxCache.get(cacheKey)
  if (cached && cached.coords === coords) return cached.box

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of coords) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const box = {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
  boundingBoxCache.set(cacheKey, { coords, box })
  return box
}

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
    // Bounding-box early exit (auto-invalidated when coordinates change).
    const bbox = getBoundingBox(`${annotation.id}-bbox`, annotation.coordinates)

    if (point.x < bbox.minX || point.x > bbox.maxX ||
        point.y < bbox.minY || point.y > bbox.maxY) {
      return false
    }

    return isPointInPolygon(point, annotation.coordinates)
  }

  if (annotation.type === "freeDraw") {
    const threshold = 5
    const thresholdSquared = threshold * threshold // 25

    const bbox = getBoundingBox(
      `${annotation.id}-freedraw-bbox`,
      annotation.coordinates,
      threshold
    )

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
  point: Point,
  annotation: Annotation,
  zoom: number
): string | null {
  // `point` must be in IMAGE space (same space as annotation.coordinates).
  // The tolerance scales with zoom so the grab area stays ~constant on screen.
  const handleSize = Math.max(8 / zoom, 4)

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

