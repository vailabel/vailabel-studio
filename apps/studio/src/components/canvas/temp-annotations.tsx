import { memo, useMemo } from "react"
import type { Annotation, Point } from "@vailabel/core"

export const TempBoxAnnotation = memo(({ annotation }: { annotation: Partial<Annotation> }) => {
  if (!annotation.coordinates || annotation.coordinates.length < 2) return null
  const styles = useMemo(
    () => ({
      left: annotation.coordinates![0].x,
      top: annotation.coordinates![0].y,
      width: annotation.coordinates![1].x - annotation.coordinates![0].x,
      height: annotation.coordinates![1].y - annotation.coordinates![0].y,
      backgroundColor: (annotation.color || "#3b82f6") + "33",
      borderColor: annotation.color || "#3b82f6",
    }),
    [annotation.coordinates, annotation.color]
  )
  return (
    <div
      className="absolute border-2 bg-opacity-20 pointer-events-none"
      style={styles}
      data-testid="temp-box-annotation"
    />
  )
})

export const TempPolygonAnnotation = memo(({ annotation }: { annotation: Partial<Annotation> }) => {
  if (!annotation.coordinates || annotation.coordinates.length < 2) return null
  const pointsAttr = useMemo(
    () => annotation.coordinates!.map((p: Point) => `${p.x},${p.y}`).join(" "),
    [annotation.coordinates]
  )
  const stroke = annotation.color || "#3b82f6"
  const fill = (annotation.color || "#3b82f6") + "33"
  return (
    <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
      <polygon points={pointsAttr} style={{ fill, stroke, strokeWidth: 2 }} />
    </svg>
  )
})

export const TempFreeDrawAnnotation = memo(({ annotation }: { annotation: Partial<Annotation> }) => {
  if (!annotation.coordinates || annotation.coordinates.length === 0) return null
  const pathData = useMemo(() => {
    const coords = annotation.coordinates as Point[]
    if (coords.length === 1) {
      const p = coords[0]
      return `M ${p.x} ${p.y} L ${p.x} ${p.y}`
    }
    let path = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 1; i < coords.length; i++) {
      path += ` L ${coords[i].x} ${coords[i].y}`
    }
    return path
  }, [annotation.coordinates])
  const stroke = annotation.color || "#3b82f6"
  return (
    <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
      <path d={pathData} style={{ fill: "none", stroke, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} />
    </svg>
  )
})

TempBoxAnnotation.displayName = "TempBoxAnnotation"
TempPolygonAnnotation.displayName = "TempPolygonAnnotation"
TempFreeDrawAnnotation.displayName = "TempFreeDrawAnnotation"

