import { memo, useMemo } from "react"
import {
  useCanvasContainer,
  useCanvasDisplay,
  useCanvasState,
} from "@/contexts/canvas-context"

interface RulerProps {
  /** Same screen transform the annotations use: screen = image * zoom + baseOffset. */
  baseOffset: { x: number; y: number }
}

const RULER = 18 // px thickness of each ruler strip

// Pick a "nice" tick step (1 / 2 / 5 × 10^n) so labels land on round numbers and
// sit roughly `target` image-units apart.
function niceStep(target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(target)))
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= target) return m * pow
  }
  return 10 * pow
}

function ticksFor(min: number, max: number, step: number) {
  const out: { v: number }[] = []
  if (step <= 0 || !Number.isFinite(min) || !Number.isFinite(max)) return out
  let v = Math.ceil(min / step) * step
  let guard = 0
  while (v <= max && guard < 1000) {
    out.push({ v })
    v += step
    guard++
  }
  return out
}

/**
 * Photoshop-style rulers along the top and left edges of the canvas, labeled in
 * image-pixel coordinates. Toggled via the toolbar (Ruler / "R"). Maps image
 * coordinates to screen using the same transform as the annotations.
 */
export const Ruler = memo(({ baseOffset }: RulerProps) => {
  const { container } = useCanvasContainer()
  const { zoom } = useCanvasState<{ zoom: number }>((s) => ({ zoom: s.zoom }))
  const { showRuler } = useCanvasDisplay()

  const { width, height } = container

  const xTicks = useMemo(() => {
    if (!width || zoom <= 0) return []
    const step = niceStep(70 / zoom)
    const minX = (RULER - baseOffset.x) / zoom
    const maxX = (width - baseOffset.x) / zoom
    return ticksFor(minX, maxX, step).map(({ v }) => ({
      v,
      screen: v * zoom + baseOffset.x,
    }))
  }, [width, zoom, baseOffset.x])

  const yTicks = useMemo(() => {
    if (!height || zoom <= 0) return []
    const step = niceStep(70 / zoom)
    const minY = (RULER - baseOffset.y) / zoom
    const maxY = (height - baseOffset.y) / zoom
    return ticksFor(minY, maxY, step).map(({ v }) => ({
      v,
      screen: v * zoom + baseOffset.y,
    }))
  }, [height, zoom, baseOffset.y])

  if (!showRuler || !width || !height) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      data-testid="ruler"
    >
      {/* Top ruler */}
      <div
        className="absolute left-0 top-0 overflow-hidden border-b border-border bg-card/85 backdrop-blur-sm"
        style={{ width, height: RULER }}
      >
        {xTicks.map(({ v, screen }) => (
          <div
            key={`x-${v}`}
            className="absolute bottom-0 top-0"
            style={{ left: screen }}
          >
            <div className="absolute bottom-0 h-1.5 w-px bg-muted-foreground/60" />
            <span className="absolute left-0.5 top-0.5 text-[9px] leading-none text-muted-foreground">
              {v}
            </span>
          </div>
        ))}
      </div>

      {/* Left ruler */}
      <div
        className="absolute left-0 top-0 overflow-hidden border-r border-border bg-card/85 backdrop-blur-sm"
        style={{ width: RULER, height }}
      >
        {yTicks.map(({ v, screen }) => (
          <div
            key={`y-${v}`}
            className="absolute left-0 right-0"
            style={{ top: screen }}
          >
            <div className="absolute right-0 h-px w-1.5 bg-muted-foreground/60" />
            <span
              className="absolute left-0.5 top-0.5 text-[9px] leading-none text-muted-foreground"
              style={{ writingMode: "vertical-rl" }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>

      {/* Corner */}
      <div
        className="absolute left-0 top-0 border-b border-r border-border bg-card"
        style={{ width: RULER, height: RULER }}
      />
    </div>
  )
})

Ruler.displayName = "Ruler"
