import { calculatePolygonCentroid, isPointInPolygon } from "@/lib/canvas-utils"
import { Point } from "@vailabel/core"

describe("canvas-utils", () => {
  describe("calculatePolygonCentroid", () => {
    it("calculates the centroid of a triangle", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 2, y: 4 },
      ]
      const centroid = calculatePolygonCentroid(points)
      expect(centroid.x).toBeCloseTo(2)
      expect(centroid.y).toBeCloseTo(1.333, 2)
    })

    it("calculates the centroid of a square", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
      ]
      const centroid = calculatePolygonCentroid(points)
      expect(centroid.x).toBeCloseTo(1)
      expect(centroid.y).toBeCloseTo(1)
    })
  })

  describe("isPointInPolygon", () => {
    const polygon: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]

    it("returns true for a point inside the polygon", () => {
      expect(isPointInPolygon({ x: 2, y: 2 }, polygon)).toBe(true)
    })

    it("returns false for a point outside the polygon", () => {
      expect(isPointInPolygon({ x: 5, y: 5 }, polygon)).toBe(false)
    })

    it("returns false for a point on the edge of the polygon", () => {
      expect(isPointInPolygon({ x: 0, y: 0 }, polygon)).toBe(false)
    })
  })
})
