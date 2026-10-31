import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Label } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import {
  brushValue,
  ellipseValue,
  keypointValue,
  polygonValue,
  rectangleValue,
  UNLABELED_SHAPE_TWIN,
  valueForControl,
} from "@/shared/lib/label-config/result"
import { choicesToLabels } from "@/shared/lib/label-config/config-helpers"
import { encodeMask } from "@/features/studio/model/lib/brush-rle"
import type { Pt } from "./region-types"
import type { RegionTools } from "./region-tools"

export type PendingGeom =
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "ellipse"; x: number; y: number; width: number; height: number }
  | { kind: "polygon"; points: Pt[] }
  | { kind: "point"; x: number; y: number }
  | { kind: "brush"; mask: Uint8Array; width: number; height: number }

interface Pending {
  control: ControlTag
  geom: PendingGeom
  clientX: number
  clientY: number
}

/** A live, un-committed drag preview (the bounding box of the shape drawn). */
export interface BoxPreview {
  shape: "rect" | "ellipse"
  x: number
  y: number
  width: number
  height: number
}

interface CreateRegion {
  (control: ControlTag, value: Record<string, unknown>, color: string): void
}

/** Shape families drawn by dragging out a bounding box. */
const DRAG_SHAPES: Record<string, "rect" | "ellipse"> = {
  rectanglelabels: "rect",
  ellipselabels: "ellipse",
}

/** Stroke color for regions of an unlabeled control. */
const UNLABELED_COLOR = "#64748b"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

function geomValue(geom: PendingGeom, labels: string[]): Record<string, unknown> {
  switch (geom.kind) {
    case "rect":
      return rectangleValue(geom.x, geom.y, geom.width, geom.height, labels)
    case "ellipse":
      return ellipseValue(
        geom.x + geom.width / 2,
        geom.y + geom.height / 2,
        geom.width / 2,
        geom.height / 2,
        labels
      )
    case "polygon":
      return polygonValue(geom.points, labels)
    case "point":
      return keypointValue(geom.x, geom.y, labels)
    case "brush":
      return brushValue(encodeMask(geom.mask), geom.width, geom.height, labels)
  }
}

/**
 * Owns the drawing interaction state for one region surface: the in-progress
 * box drag / polygon points / cursor, and the pending region awaiting a label.
 * The active tool comes from `tools` (shared across surfaces). Labeled controls
 * ask for a label through the floating menu; unlabeled shapes (<Rectangle>, …)
 * commit straight away. `extra` is merged into every committed value (e.g. the
 * PDF page or DICOM slice the region belongs to).
 */
export function useImageRegionDraw(
  tools: RegionTools,
  onCreateRegion: CreateRegion,
  extra?: Record<string, unknown>
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boxDrag, setBoxDrag] = useState<{ start: Pt; current: Pt } | null>(null)
  const [poly, setPoly] = useState<Pt[]>([])
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const { active, shape } = tools
  const labels = useMemo(() => (active ? choicesToLabels(active) : []), [active])

  // Abandon an in-progress polygon when the tool changes.
  const [polyTool, setPolyTool] = useState(active)
  if (polyTool !== active) {
    setPolyTool(active)
    setPoly([])
    setCursor(null)
  }

  const fracOf = useCallback((clientX: number, clientY: number): Pt => {
    const rect = containerRef.current!.getBoundingClientRect()
    return [
      clamp01((clientX - rect.left) / rect.width) * 100,
      clamp01((clientY - rect.top) / rect.height) * 100,
    ]
  }, [])

  const commit = useCallback(
    (control: ControlTag, geom: PendingGeom, label?: Label) => {
      const value = valueForControl(
        control.tag,
        geomValue(geom, label ? [label.name] : [])
      )
      onCreateRegion(
        control,
        extra ? { ...value, ...extra } : value,
        label?.color ?? control.attrs.strokecolor ?? UNLABELED_COLOR
      )
    },
    [onCreateRegion, extra]
  )

  /** A finished shape: commit it, or ask for a label first. */
  const propose = useCallback(
    (geom: PendingGeom, clientX: number, clientY: number) => {
      if (!active) return
      if (UNLABELED_SHAPE_TWIN[active.tag]) commit(active, geom)
      else setPending({ control: active, geom, clientX, clientY })
    },
    [active, commit]
  )

  // Box / ellipse tools: pointer drag.
  const dragShape = shape ? DRAG_SHAPES[shape] : undefined
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!dragShape) return
      const point = fracOf(event.clientX, event.clientY)
      setBoxDrag({ start: point, current: point })
    },
    [dragShape, fracOf]
  )

  useEffect(() => {
    if (!boxDrag) return
    const onMove = (event: PointerEvent) =>
      setBoxDrag((drag) =>
        drag ? { ...drag, current: fracOf(event.clientX, event.clientY) } : drag
      )
    const onUp = (event: PointerEvent) => {
      const end = fracOf(event.clientX, event.clientY)
      const x = Math.min(boxDrag.start[0], end[0])
      const y = Math.min(boxDrag.start[1], end[1])
      const width = Math.abs(end[0] - boxDrag.start[0])
      const height = Math.abs(end[1] - boxDrag.start[1])
      setBoxDrag(null)
      if (dragShape && width >= 1 && height >= 1) {
        propose({ kind: dragShape, x, y, width, height }, event.clientX, event.clientY)
      }
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [boxDrag, dragShape, fracOf, propose])

  // Polygon / keypoint tools: clicks.
  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!active) return
      const point = fracOf(event.clientX, event.clientY)
      if (shape === "keypointlabels") {
        propose({ kind: "point", x: point[0], y: point[1] }, event.clientX, event.clientY)
      } else if (shape === "polygonlabels") {
        if (poly.length >= 3 && dist(point, poly[0]) < 4) {
          propose({ kind: "polygon", points: poly }, event.clientX, event.clientY)
          setPoly([])
          setCursor(null)
        } else {
          setPoly((current) => [...current, point])
        }
      }
    },
    [active, shape, poly, fracOf, propose]
  )

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (shape === "polygonlabels" && poly.length > 0) {
        setCursor(fracOf(event.clientX, event.clientY))
      }
    },
    [shape, poly.length, fracOf]
  )

  const pickLabel = useCallback(
    (label: Label) => {
      if (!pending) return
      commit(pending.control, pending.geom, label)
      setPending(null)
    },
    [pending, commit]
  )

  const dismissPending = useCallback(() => setPending(null), [])

  const boxPreview: BoxPreview | null = boxDrag
    ? {
        shape: dragShape ?? "rect",
        x: Math.min(boxDrag.start[0], boxDrag.current[0]),
        y: Math.min(boxDrag.start[1], boxDrag.current[1]),
        width: Math.abs(boxDrag.current[0] - boxDrag.start[0]),
        height: Math.abs(boxDrag.current[1] - boxDrag.start[1]),
      }
    : null

  return {
    containerRef,
    labels,
    poly,
    cursor,
    pending,
    boxPreview,
    fracOf,
    propose,
    onPointerDown,
    onClick,
    onMouseMove,
    pickLabel,
    dismissPending,
  }
}
