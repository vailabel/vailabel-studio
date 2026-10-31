import { memo, useEffect, useRef } from "react"

interface MaskLayerProps {
  mask: Uint8Array
  width: number
  height: number
  color: string
}

/** A stored brush mask, tinted with its label color and stretched over the
 *  surface (the canvas keeps the mask's own raster size). */
export const MaskLayer = memo(({ mask, width, height, color }: MaskLayerProps) => {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (!ctx) return
    const data = ctx.createImageData(width, height)
    for (let i = 0; i < mask.length; i++) if (mask[i]) data.data[i * 4 + 3] = 255
    ctx.clearRect(0, 0, width, height)
    ctx.putImageData(data, 0, 0)
    // Tint: keep the mask's alpha, take the label's color.
    ctx.globalCompositeOperation = "source-in"
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = "source-over"
  }, [mask, width, height, color])
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
    />
  )
})

MaskLayer.displayName = "MaskLayer"
