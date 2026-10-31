import { useCallback, useEffect, useRef, useState } from "react"
import { maskFromImageData } from "@/features/studio/model/lib/brush-rle"
import type { Pt } from "./region-types"
import type { PendingGeom } from "./use-image-region-draw"
import type { RegionTools } from "./region-tools"

/** Raster size of the surface a brush paints on (the media's natural size). */
export interface RasterSize {
  width: number
  height: number
}

const DRAFT_COLOR = "rgba(59,130,246,0.55)"

/**
 * Brush tool for one region surface: strokes (and eraser strokes) accumulate on
 * a draft canvas at the media's natural resolution until the annotator saves
 * the mask, which is handed to `propose` as a coverage raster. Pointer
 * positions come in as % of the surface via `fracOf`.
 */
export function useBrushDraw(
  tools: RegionTools,
  size: RasterSize | null,
  fracOf: (clientX: number, clientY: number) => Pt,
  propose: (geom: PendingGeom, clientX: number, clientY: number) => void
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [painting, setPainting] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const last = useRef<Pt | null>(null)
  const enabled = tools.shape === "brushlabels" && !!size

  const toPixels = useCallback(
    (point: Pt): Pt =>
      size ? [(point[0] / 100) * size.width, (point[1] / 100) * size.height] : point,
    [size]
  )

  const stroke = useCallback(
    (from: Pt, to: Pt) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx || !size) return
      ctx.globalCompositeOperation = tools.erasing ? "destination-out" : "source-over"
      ctx.strokeStyle = DRAFT_COLOR
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = Math.max(1, (tools.brushSize / 100) * size.width)
      const [x0, y0] = toPixels(from)
      const [x1, y1] = toPixels(to)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1 + 0.01, y1)
      ctx.stroke()
    },
    [size, tools.erasing, tools.brushSize, toPixels]
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return
      const point = fracOf(event.clientX, event.clientY)
      last.current = point
      stroke(point, point)
      setPainting(true)
      if (!tools.erasing) setHasDraft(true)
    },
    [enabled, fracOf, stroke, tools.erasing]
  )

  useEffect(() => {
    if (!painting) return
    const onMove = (event: PointerEvent) => {
      const point = fracOf(event.clientX, event.clientY)
      if (last.current) stroke(last.current, point)
      last.current = point
    }
    const onUp = () => {
      last.current = null
      setPainting(false)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [painting, fracOf, stroke])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
    setHasDraft(false)
  }, [])

  /** Hand the painted mask over for labeling; the draft is cleared once the
   *  region is created (see `clear`). */
  const save = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx || !size) return
      const mask = maskFromImageData(ctx.getImageData(0, 0, size.width, size.height))
      for (let i = 0; i < mask.length; i++) mask[i] = mask[i] ? 255 : 0
      if (!mask.some(Boolean)) return clear()
      propose({ kind: "brush", mask, width: size.width, height: size.height }, clientX, clientY)
    },
    [size, propose, clear]
  )

  return { canvasRef, enabled, hasDraft, onPointerDown, save, clear }
}
