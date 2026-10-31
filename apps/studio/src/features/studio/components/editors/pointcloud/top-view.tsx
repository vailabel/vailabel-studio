import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PointCloud } from "@/features/studio/model/lib/pointcloud/point-cloud"
import { boundsOf } from "@/features/studio/model/lib/pointcloud/point-cloud"
import {
  footprintCorners,
  footprintFromDrag,
  inFootprint,
  type Cuboid,
} from "@/features/studio/model/lib/pointcloud/cuboid"
import type { ViewCuboid } from "./point-cloud-viewport"

interface TopViewProps {
  cloud: PointCloud
  cuboids: ViewCuboid[]
  selectedId: string | null
  /** Dragging draws a new footprint (otherwise clicks select). */
  drawing: boolean
  onSelect: (id: string | null) => void
  onCreate: (footprint: Omit<Cuboid, "z" | "height">) => void
}

interface View {
  /** World point at the canvas center. */
  cx: number
  cy: number
  /** Pixels per metre. */
  scale: number
}

type Pt = [number, number]

/**
 * Bird's-eye view (x forward = up, y left = left) for placing cuboids: drag a
 * footprint in draw mode, click a footprint to select it, scroll to zoom and
 * right-drag to pan. Points are tinted by height.
 */
export const TopView = memo(({ cloud, cuboids, selectedId, drawing, onSelect, onCreate }: TopViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const bounds = useMemo(() => boundsOf(cloud.positions), [cloud])
  const [view, setView] = useState<View>(() => ({
    cx: (bounds.min[0] + bounds.max[0]) / 2,
    cy: (bounds.min[1] + bounds.max[1]) / 2,
    scale: 8,
  }))
  const [drag, setDrag] = useState<{ start: Pt; current: Pt } | null>(null)
  const pan = useRef<{ x: number; y: number; view: View } | null>(null)

  const toScreen = useCallback(
    (wx: number, wy: number): Pt => [
      size.width / 2 - (wy - view.cy) * view.scale,
      size.height / 2 - (wx - view.cx) * view.scale,
    ],
    [size, view]
  )
  const toWorld = useCallback(
    (px: number, py: number): Pt => [
      view.cx - (py - size.height / 2) / view.scale,
      view.cy - (px - size.width / 2) / view.scale,
    ],
    [size, view]
  )
  const eventWorld = (event: { clientX: number; clientY: number }): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return toWorld(event.clientX - rect.left, event.clientY - rect.top)
  }

  // Track the canvas size.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) })
    )
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Paint points, footprints and the drag preview.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !size.width) return
    canvas.width = size.width
    canvas.height = size.height
    ctx.fillStyle = "#0b0f19"
    ctx.fillRect(0, 0, size.width, size.height)
    const image = ctx.getImageData(0, 0, size.width, size.height)
    const zSpan = bounds.max[2] - bounds.min[2] || 1
    const { positions } = cloud
    for (let i = 0; i < positions.length; i += 3) {
      const [px, py] = toScreen(positions[i], positions[i + 1])
      const x = Math.round(px)
      const y = Math.round(py)
      if (x < 0 || y < 0 || x >= size.width || y >= size.height) continue
      const shade = 80 + Math.round(((positions[i + 2] - bounds.min[2]) / zSpan) * 175)
      image.data.set([shade, shade, 255 - shade / 2, 255], (y * size.width + x) * 4)
    }
    ctx.putImageData(image, 0, 0)

    for (const cuboid of cuboids) {
      const corners = footprintCorners(cuboid).map(([wx, wy]) => toScreen(wx, wy))
      ctx.beginPath()
      corners.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.strokeStyle = cuboid.id === selectedId ? "#ffffff" : cuboid.color
      ctx.lineWidth = cuboid.id === selectedId ? 2.5 : 1.5
      ctx.stroke()
      // Heading: center → front edge midpoint.
      const [hx, hy] = toScreen(
        cuboid.x + (Math.cos(cuboid.yaw) * cuboid.length) / 2,
        cuboid.y + (Math.sin(cuboid.yaw) * cuboid.length) / 2
      )
      const [ox, oy] = toScreen(cuboid.x, cuboid.y)
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(hx, hy)
      ctx.stroke()
    }

    if (drag) {
      const [ax, ay] = toScreen(...drag.start)
      const [bx, by] = toScreen(...drag.current)
      ctx.strokeStyle = "#3b82f6"
      ctx.setLineDash([4, 3])
      ctx.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay))
      ctx.setLineDash([])
    }
  }, [cloud, bounds, cuboids, selectedId, drag, size, toScreen])

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    if (event.button !== 0) {
      pan.current = { x: event.clientX, y: event.clientY, view }
      return
    }
    const point = eventWorld(event)
    if (drawing) {
      setDrag({ start: point, current: point })
      return
    }
    const hit = [...cuboids].reverse().find((cuboid) => inFootprint(cuboid, point[0], point[1]))
    onSelect(hit?.id ?? null)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (pan.current) {
      const { x, y, view: start } = pan.current
      setView({
        ...start,
        cx: start.cx + (event.clientY - y) / start.scale,
        cy: start.cy + (event.clientX - x) / start.scale,
      })
    } else if (drag) {
      setDrag({ ...drag, current: eventWorld(event) })
    }
  }

  const onPointerUp = () => {
    pan.current = null
    if (!drag) return
    const footprint = footprintFromDrag(drag.start, drag.current)
    setDrag(null)
    if (footprint.length >= 0.2 && footprint.width >= 0.2) onCreate(footprint)
  }

  const onWheel = (event: React.WheelEvent) => {
    const factor = Math.exp(-event.deltaY * 0.0015)
    setView((current) => ({ ...current, scale: Math.max(0.5, Math.min(200, current.scale * factor)) }))
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
      className={drawing ? "h-full w-full cursor-crosshair" : "h-full w-full cursor-default"}
    />
  )
})

TopView.displayName = "TopView"
