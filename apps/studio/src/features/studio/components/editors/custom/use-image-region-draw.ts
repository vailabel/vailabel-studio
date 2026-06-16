import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Label } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import {
  keypointValue,
  polygonValue,
  rectangleValue,
} from "@/shared/lib/label-config/result"
import { choicesToLabels } from "@/shared/lib/label-config/config-helpers"
import type { Pt } from "./region-types"

type PendingGeom =
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "polygon"; points: Pt[] }
  | { kind: "point"; x: number; y: number }

interface Pending {
  control: ControlTag
  geom: PendingGeom
  clientX: number
  clientY: number
}

/** A live, un-committed box preview while the pointer is dragging. */
export interface BoxPreview {
  x: number
  y: number
  width: number
  height: number
}

interface CreateRegion {
  (control: ControlTag, value: Record<string, unknown>, color: string): void
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/**
 * Owns all drawing interaction state for the image region editor: which control
 * tool is active, the in-progress box drag / polygon points / cursor, and the
 * pending region awaiting a label. Returns the container ref to spread onto the
 * image box, the pointer handlers, and the derived render state. The host
 * component stays a thin presentational renderer.
 */
export function useImageRegionDraw(
  controls: ControlTag[],
  onCreateRegion: CreateRegion
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [boxDrag, setBoxDrag] = useState<{ start: Pt; current: Pt } | null>(null)
  const [poly, setPoly] = useState<Pt[]>([])
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const active = controls[activeIndex]
  const labels = useMemo(() => (active ? choicesToLabels(active) : []), [active])

  const fracOf = useCallback((clientX: number, clientY: number): Pt => {
    const rect = containerRef.current!.getBoundingClientRect()
    return [
      clamp01((clientX - rect.left) / rect.width) * 100,
      clamp01((clientY - rect.top) / rect.height) * 100,
    ]
  }, [])

  // Switch the active drawing tool, abandoning any in-progress polygon.
  const selectTool = useCallback((index: number) => {
    setActiveIndex(index)
    setPoly([])
  }, [])

  // Box tool: pointer drag.
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (active?.tag !== "rectanglelabels") return
      const point = fracOf(event.clientX, event.clientY)
      setBoxDrag({ start: point, current: point })
    },
    [active, fracOf]
  )

  useEffect(() => {
    if (!boxDrag) return
    const onMove = (event: PointerEvent) =>
      setBoxDrag((drag) =>
        drag ? { ...drag, current: fracOf(event.clientX, event.clientY) } : drag
      )
    const onUp = (event: PointerEvent) => {
      const end = fracOf(event.clientX, event.clientY)
      setBoxDrag((drag) => {
        if (drag && active) {
          const x = Math.min(drag.start[0], end[0])
          const y = Math.min(drag.start[1], end[1])
          const width = Math.abs(end[0] - drag.start[0])
          const height = Math.abs(end[1] - drag.start[1])
          if (width >= 1 && height >= 1) {
            setPending({
              control: active,
              geom: { kind: "rect", x, y, width, height },
              clientX: event.clientX,
              clientY: event.clientY,
            })
          }
        }
        return null
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [boxDrag, active, fracOf])

  // Polygon / keypoint tools: clicks.
  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!active) return
      const point = fracOf(event.clientX, event.clientY)
      if (active.tag === "keypointlabels") {
        setPending({
          control: active,
          geom: { kind: "point", x: point[0], y: point[1] },
          clientX: event.clientX,
          clientY: event.clientY,
        })
      } else if (active.tag === "polygonlabels") {
        if (poly.length >= 3 && dist(point, poly[0]) < 4) {
          setPending({
            control: active,
            geom: { kind: "polygon", points: poly },
            clientX: event.clientX,
            clientY: event.clientY,
          })
          setPoly([])
          setCursor(null)
        } else {
          setPoly((current) => [...current, point])
        }
      }
    },
    [active, poly, fracOf]
  )

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (active?.tag === "polygonlabels" && poly.length > 0) {
        setCursor(fracOf(event.clientX, event.clientY))
      }
    },
    [active, poly.length, fracOf]
  )

  const pickLabel = useCallback(
    (label: Label) => {
      if (!pending) return
      const { control, geom } = pending
      const value =
        geom.kind === "rect"
          ? rectangleValue(geom.x, geom.y, geom.width, geom.height, [label.name])
          : geom.kind === "polygon"
            ? polygonValue(geom.points, [label.name])
            : keypointValue(geom.x, geom.y, [label.name])
      onCreateRegion(control, value, label.color)
      setPending(null)
    },
    [pending, onCreateRegion]
  )

  const dismissPending = useCallback(() => setPending(null), [])

  const boxPreview: BoxPreview | null = boxDrag
    ? {
        x: Math.min(boxDrag.start[0], boxDrag.current[0]),
        y: Math.min(boxDrag.start[1], boxDrag.current[1]),
        width: Math.abs(boxDrag.current[0] - boxDrag.start[0]),
        height: Math.abs(boxDrag.current[1] - boxDrag.start[1]),
      }
    : null

  return {
    containerRef,
    active,
    activeIndex,
    labels,
    poly,
    cursor,
    pending,
    boxPreview,
    selectTool,
    onPointerDown,
    onClick,
    onMouseMove,
    pickLabel,
    dismissPending,
  }
}
