import { Point } from "./types"

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

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }
  return inside
}
