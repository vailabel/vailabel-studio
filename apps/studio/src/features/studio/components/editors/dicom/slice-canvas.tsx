import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react"
import { applyWindow, type DicomPixels } from "@/shared/lib/dicom/dicom"

interface SliceCanvasProps {
  pixels: DicomPixels
  center: number
  width: number
}

/** One DICOM slice through a window / level, at its native resolution. */
export const SliceCanvas = memo(
  forwardRef<HTMLCanvasElement, SliceCanvasProps>(({ pixels, center, width }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    useImperativeHandle(ref, () => canvasRef.current!)
    useEffect(() => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      ctx.putImageData(new ImageData(applyWindow(pixels, center, width), pixels.width, pixels.height), 0, 0)
    }, [pixels, center, width])
    return (
      <canvas
        ref={canvasRef}
        width={pixels.width}
        height={pixels.height}
        className="block w-full [image-rendering:pixelated]"
      />
    )
  })
)

SliceCanvas.displayName = "SliceCanvas"
