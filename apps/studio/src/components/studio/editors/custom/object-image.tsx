import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Circle, PenTool, Square, X } from "lucide-react"
import { toAssetUrl } from "@/lib/desktop"
import { cn, rgbToRgba } from "@/lib/utils"
import type { ImageData, Label } from "@/types/core"
import type { ControlTag } from "@/lib/label-config/types"
import type { StoredResult } from "@/lib/label-config/result"
import {
  keypointValue,
  polygonValue,
  rectangleValue,
} from "@/lib/label-config/result"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { choicesToLabels, colorForChoice } from "./config-helpers"

type Pt = [number, number]

type Region =
  | { id: string; tag: "rectanglelabels"; x: number; y: number; width: number; height: number; label: string; color: string }
  | { id: string; tag: "polygonlabels"; points: Pt[]; label: string; color: string }
  | { id: string; tag: "keypointlabels"; x: number; y: number; label: string; color: string }

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

interface ObjectImageProps {
  doc: ImageData
  /** Spatial controls bound to this image (rectangle/polygon/keypoint). */
  controls: ControlTag[]
  resultsByControl: Record<string, StoredResult[]>
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

const TOOL_ICON: Record<string, typeof Square> = {
  rectanglelabels: Square,
  polygonlabels: PenTool,
  keypointlabels: Circle,
}

export const ObjectImage = memo(
  ({ doc, controls, resultsByControl, onCreateRegion, onDeleteRegion }: ObjectImageProps) => {
    const ref = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [boxDrag, setBoxDrag] = useState<{ start: Pt; current: Pt } | null>(null)
    const [poly, setPoly] = useState<Pt[]>([])
    const [cursor, setCursor] = useState<Pt | null>(null)
    const [pending, setPending] = useState<Pending | null>(null)

    const active = controls[activeIndex]
    const labels = useMemo(
      () => (active ? choicesToLabels(active) : []),
      [active]
    )

    const regions = useMemo<Region[]>(() => {
      const out: Region[] = []
      for (const control of controls) {
        for (const result of resultsByControl[control.name] ?? []) {
          const value = result.value as Record<string, unknown>
          const name =
            ((value[control.tag] as string[] | undefined)?.[0]) ?? control.name
          const color = colorForChoice(control, name)
          if (control.tag === "rectanglelabels") {
            out.push({
              id: result.id,
              tag: "rectanglelabels",
              x: value.x as number,
              y: value.y as number,
              width: value.width as number,
              height: value.height as number,
              label: name,
              color,
            })
          } else if (control.tag === "polygonlabels") {
            out.push({
              id: result.id,
              tag: "polygonlabels",
              points: (value.points as Pt[]) ?? [],
              label: name,
              color,
            })
          } else if (control.tag === "keypointlabels") {
            out.push({
              id: result.id,
              tag: "keypointlabels",
              x: value.x as number,
              y: value.y as number,
              label: name,
              color,
            })
          }
        }
      }
      return out
    }, [controls, resultsByControl])

    const fracOf = useCallback((clientX: number, clientY: number): Pt => {
      const rect = ref.current!.getBoundingClientRect()
      return [
        clamp01((clientX - rect.left) / rect.width) * 100,
        clamp01((clientY - rect.top) / rect.height) * 100,
      ]
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

    const boxPreview =
      boxDrag &&
      ({
        x: Math.min(boxDrag.start[0], boxDrag.current[0]),
        y: Math.min(boxDrag.start[1], boxDrag.current[1]),
        width: Math.abs(boxDrag.current[0] - boxDrag.start[0]),
        height: Math.abs(boxDrag.current[1] - boxDrag.start[1]),
      } as const)

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {controls.length > 1 && (
          <div className="flex items-center gap-1 border-b border-border bg-card px-3 py-1.5">
            {controls.map((control, index) => {
              const Icon = TOOL_ICON[control.tag] ?? Square
              return (
                <button
                  key={control.name}
                  type="button"
                  onClick={() => {
                    setActiveIndex(index)
                    setPoly([])
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    index === activeIndex
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="size-3.5" />
                  {control.name}
                </button>
              )
            })}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div
            ref={ref}
            onPointerDown={onPointerDown}
            onClick={onClick}
            onMouseMove={onMouseMove}
            className={cn(
              "relative mx-auto w-full max-w-4xl select-none",
              active && "cursor-crosshair"
            )}
          >
            <img
              src={toAssetUrl(doc.path)}
              alt={doc.name}
              draggable={false}
              className="block w-full rounded"
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {regions.map((region) =>
                region.tag === "rectanglelabels" ? (
                  <rect
                    key={region.id}
                    x={region.x}
                    y={region.y}
                    width={region.width}
                    height={region.height}
                    fill={rgbToRgba(region.color, 0.12)}
                    stroke={region.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : region.tag === "polygonlabels" ? (
                  <polygon
                    key={region.id}
                    points={region.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
                    fill={rgbToRgba(region.color, 0.12)}
                    stroke={region.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null
              )}

              {boxPreview && boxPreview.width > 0 && (
                <rect
                  x={boxPreview.x}
                  y={boxPreview.y}
                  width={boxPreview.width}
                  height={boxPreview.height}
                  fill="rgba(59,130,246,0.15)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {poly.length > 0 && (
                <polyline
                  points={[...poly, cursor ?? poly[poly.length - 1]]
                    .map((p) => `${p[0]},${p[1]}`)
                    .join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* HTML overlay: keypoints, labels, vertices, delete buttons */}
            <div className="pointer-events-none absolute inset-0">
              {regions.map((region) => {
                const anchor =
                  region.tag === "polygonlabels"
                    ? region.points[0] ?? [0, 0]
                    : [region.x, region.y]
                return (
                  <div key={region.id}>
                    {region.tag === "keypointlabels" && (
                      <span
                        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                        style={{
                          left: `${region.x}%`,
                          top: `${region.y}%`,
                          backgroundColor: region.color,
                        }}
                      />
                    )}
                    <span
                      className="pointer-events-auto absolute inline-flex -translate-y-full items-center gap-0.5 rounded-t px-1 text-[10px] font-semibold uppercase leading-tight text-white"
                      style={{
                        left: `${anchor[0]}%`,
                        top: `${anchor[1]}%`,
                        backgroundColor: region.color,
                      }}
                    >
                      {region.label}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleteRegion(region.id)
                        }}
                        className="rounded-full hover:bg-black/20"
                        aria-label={`Remove ${region.label}`}
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  </div>
                )
              })}

              {/* In-progress polygon vertices */}
              {poly.map((point, index) => (
                <span
                  key={index}
                  className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white"
                  style={{ left: `${point[0]}%`, top: `${point[1]}%` }}
                />
              ))}
            </div>
          </div>

          {active?.tag === "polygonlabels" && poly.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Click the first point to close the polygon ({poly.length} point
              {poly.length === 1 ? "" : "s"}).
            </p>
          )}
        </div>

        {pending && (
          <FloatingLabelMenu
            x={pending.clientX}
            y={pending.clientY}
            labels={labels}
            emptyHint="Add a label to this control."
            onPick={pickLabel}
            onDismiss={() => setPending(null)}
          />
        )}
      </div>
    )
  }
)

ObjectImage.displayName = "ObjectImage"
