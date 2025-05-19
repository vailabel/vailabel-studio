import { Point } from "@vailabel/core"

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
