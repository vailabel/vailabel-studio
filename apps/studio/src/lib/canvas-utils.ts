import { Point } from "@/types/core"

/**
 * Ramer–Douglas–Peucker polyline simplification (iterative, image-space units).
 *
 * Drops vertices that lie within `epsilon` of the line between the kept points,
 * collapsing the dense, near-collinear contours SAM/segmentation masks produce
 * into a handful of meaningful vertices. Iterative (explicit stack) rather than
 * recursive so a multi-thousand-point mask contour can't blow the call stack.
 *
 * Operates on the vertex list as an open polyline (first and last are always
 * kept); for a closed polygon that just means the closing seam isn't collapsed,
 * which is fine. Returns a new array.
 */
export const simplifyPolyline = (points: Point[], epsilon: number): Point[] => {
  const n = points.length
  if (n < 3 || epsilon <= 0) return points.slice()

  const keep = new Array<boolean>(n).fill(false)
  keep[0] = true
  keep[n - 1] = true

  const eps2 = epsilon * epsilon
  const stack: Array<[number, number]> = [[0, n - 1]]

  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number]
    if (end - start < 2) continue

    const a = points[start]
    const b = points[end]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const segLen2 = dx * dx + dy * dy

    let maxDist2 = -1
    let farthest = -1
    for (let i = start + 1; i < end; i++) {
      const p = points[i]
      let dist2: number
      if (segLen2 === 0) {
        const ex = p.x - a.x
        const ey = p.y - a.y
        dist2 = ex * ex + ey * ey
      } else {
        // Perpendicular distance² from p to the segment a→b.
        const cross = (p.x - a.x) * dy - (p.y - a.y) * dx
        dist2 = (cross * cross) / segLen2
      }
      if (dist2 > maxDist2) {
        maxDist2 = dist2
        farthest = i
      }
    }

    if (maxDist2 > eps2 && farthest !== -1) {
      keep[farthest] = true
      stack.push([start, farthest])
      stack.push([farthest, end])
    }
  }

  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(points[i])
  }
  return out
}

export const calculatePolygonCentroid = (points: Point[]): Point => {
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

export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y
    const xj = polygon[j].x,
      yj = polygon[j].y

    // Check if point is exactly on a vertex
    if (
      (point.x === xi && point.y === yi) ||
      (point.x === xj && point.y === yj)
    ) {
      return false
    }
    // Check if point is exactly on an edge
    const minX = Math.min(xi, xj)
    const maxX = Math.max(xi, xj)
    const minY = Math.min(yi, yj)
    const maxY = Math.max(yi, yj)
    if (
      yj - yi !== 0 &&
      (point.y - yi) * (xj - xi) === (point.x - xi) * (yj - yi) &&
      point.x >= minX &&
      point.x <= maxX &&
      point.y >= minY &&
      point.y <= maxY
    ) {
      return false
    }

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }
  return inside
}

