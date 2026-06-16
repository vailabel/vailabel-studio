import { memo, useCallback, useEffect, useRef, useState } from "react"
import { rgbToRgba } from "@/lib/utils"
import type { AudioSegment } from "@/lib/audio-segments"

interface WaveformProps {
  peaks: Array<[number, number]>
  duration: number
  segments: AudioSegment[]
  currentTime: number
  /** Allow drag-to-create a new segment. */
  interactive: boolean
  onSeek: (seconds: number) => void
  onSelectRange: (
    tStart: number,
    tEnd: number,
    clientX: number,
    clientY: number
  ) => void
}

const HEIGHT = 140

// Canvas waveform with region overlays, a playhead, drag-to-select, and
// click-to-seek. Segments are positioned as percentages so they're resolution-
// independent; the waveform itself is drawn to a pixel canvas.
export const Waveform = memo(
  ({
    peaks,
    duration,
    segments,
    currentTime,
    interactive,
    onSeek,
    onSelectRange,
  }: WaveformProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const startRef = useRef(0)
    const [width, setWidth] = useState(0)
    const [active, setActive] = useState(false)
    const [currentX, setCurrentX] = useState(0)

    // Track container width for the canvas.
    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const update = () => setWidth(el.clientWidth)
      update()
      const observer = new ResizeObserver(update)
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    // Draw the waveform whenever the peaks or width change.
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas || width === 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = HEIGHT * dpr
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, HEIGHT)
      ctx.fillStyle = getComputedStyle(canvas).color || "#888"
      const mid = HEIGHT / 2
      const n = peaks.length
      if (n === 0) return
      const barWidth = Math.max(1, width / n)
      for (let i = 0; i < n; i++) {
        const x = (i / n) * width
        const [min, max] = peaks[i]
        const yMax = mid - max * (mid - 2)
        const yMin = mid - min * (mid - 2)
        ctx.fillRect(x, yMax, barWidth, Math.max(1, yMin - yMax))
      }
    }, [peaks, width])

    const xToTime = useCallback(
      (px: number) =>
        width > 0 ? Math.max(0, Math.min(duration, (px / width) * duration)) : 0,
      [width, duration]
    )

    const onPointerDown = useCallback((event: React.PointerEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
      startRef.current = x
      setCurrentX(x)
      setActive(true)
    }, [])

    // Window-level move/up so the drag survives leaving the element.
    useEffect(() => {
      if (!active) return
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const clampX = (clientX: number) =>
        Math.max(0, Math.min(rect.width, clientX - rect.left))
      const onMove = (event: PointerEvent) => setCurrentX(clampX(event.clientX))
      const onUp = (event: PointerEvent) => {
        const x = clampX(event.clientX)
        const moved = Math.abs(x - startRef.current)
        if (moved < 4) {
          onSeek(xToTime(x))
        } else if (interactive) {
          onSelectRange(
            xToTime(startRef.current),
            xToTime(x),
            event.clientX,
            event.clientY
          )
        }
        setActive(false)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      return () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
    }, [active, interactive, onSeek, onSelectRange, xToTime])

    const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0)
    const selectionLeft = Math.min(startRef.current, currentX)
    const selectionWidth = Math.abs(currentX - startRef.current)

    return (
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        className="relative w-full cursor-text select-none overflow-hidden bg-muted/40"
        style={{ height: HEIGHT }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 text-muted-foreground" />

        {/* Segment regions */}
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="pointer-events-none absolute top-0 bottom-0 border-x"
            style={{
              left: `${pct(segment.tStart)}%`,
              width: `${pct(segment.tEnd - segment.tStart)}%`,
              backgroundColor: rgbToRgba(segment.color, 0.22),
              borderColor: segment.color,
            }}
          >
            <span
              className="absolute left-0 top-0 max-w-full truncate rounded-br px-1 text-[10px] font-semibold uppercase leading-tight text-white"
              style={{ backgroundColor: segment.color }}
            >
              {segment.label}
            </span>
          </div>
        ))}

        {/* Active drag selection */}
        {active && selectionWidth > 1 && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 bg-primary/20 ring-1 ring-primary"
            style={{ left: selectionLeft, width: selectionWidth }}
          />
        )}

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary"
          style={{ left: `${pct(currentTime)}%` }}
        />
      </div>
    )
  }
)

Waveform.displayName = "Waveform"
