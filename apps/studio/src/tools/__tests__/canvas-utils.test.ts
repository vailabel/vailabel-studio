import { getCanvasCoords, isPointInLabel, findLabelAtPoint, getResizeHandle, isPointInPolygon, calculatePolygonCentroid } from "@/tools/canvas-utils"
import type { Annotation, Point } from "@vailabel/core"

describe("tools/canvas-utils", () => {
  test("getCanvasCoords computes correct coordinates with pan and zoom", () => {
    const container = {
      getBoundingClientRect: () => ({ left: 100, top: 50 }) as any,
    } as HTMLDivElement
    const pan = { x: 20, y: 10 }
    const zoom = 2
    const p = getCanvasCoords(container, pan, zoom, 200, 150)
    expect(p.x).toBeCloseTo((200 - 100 - 20) / 2)
    expect(p.y).toBeCloseTo((150 - 50 - 10) / 2)
  })

  test("isPointInLabel detects inside box", () => {
    const box: Annotation = {
      id: "1",
      name: "b",
      type: "box",
      coordinates: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
      ],
    }
    expect(isPointInLabel({ x: 20, y: 20 }, box)).toBe(true)
    expect(isPointInLabel({ x: 5, y: 5 }, box)).toBe(false)
  })

  test("isPointInLabel works for freeDraw near-segment threshold", () => {
    const line: Annotation = {
      id: "f1",
      name: "f",
      type: "freeDraw",
      coordinates: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    }
    expect(isPointInLabel({ x: 5, y: 1 }, line)).toBe(true)
    expect(isPointInLabel({ x: 5, y: 10 }, line)).toBe(false)
  })

  test("isPointInPolygon basic square", () => {
    const poly: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    expect(isPointInPolygon({ x: 5, y: 5 }, poly)).toBe(true)
    expect(isPointInPolygon({ x: -1, y: -1 }, poly)).toBe(false)
  })

  test("calculatePolygonCentroid triangle", () => {
    const tri: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 4 },
    ]
    const c = calculatePolygonCentroid(tri)
    expect(c.x).toBeCloseTo(2)
    expect(c.y).toBeCloseTo(4 / 3, 2)
  })

  test("findLabelAtPoint selects selected annotation first, else topmost hit", () => {
    const a1: Annotation = {
      id: "a1",
      name: "a1",
      type: "box",
      coordinates: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    }
    const a2: Annotation = {
      id: "a2",
      name: "a2",
      type: "box",
      coordinates: [
        { x: 5, y: 5 },
        { x: 15, y: 15 },
      ],
    }
    const point = { x: 6, y: 6 }
    // selected first
    expect(findLabelAtPoint(point, [a1, a2], a1, isPointInLabel)).toBe(a1)
    // reverse order preference if selected not hit
    expect(findLabelAtPoint(point, [a1, a2], null, isPointInLabel)).toBe(a2)
  })

  test("getResizeHandle returns correct handle for box corners", () => {
    const container = {
      getBoundingClientRect: () => ({ left: 0, top: 0 }) as any,
    } as HTMLDivElement
    const box: Annotation = {
      id: "b1",
      name: "b1",
      type: "box",
      coordinates: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
      ],
    }
    const event = {
      clientX: 10,
      clientY: 10,
    } as unknown as React.MouseEvent
    const handle = getResizeHandle(event, box, container, { x: 0, y: 0 }, 1)
    expect(handle).toBe("top-left")
  })
})

