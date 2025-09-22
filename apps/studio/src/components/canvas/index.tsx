import { memo, useRef } from "react"
import { cn } from "@/lib/utils"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers-context"
import { type Annotation, type ImageData } from "@vailabel/core"
import { Crosshair } from "@/components/canvas/crosshair-context"
import { useCanvasZoom, useCanvasPan, useCanvasTool } from "@/contexts/canvas-context"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
}

export const Canvas = memo(({ image, annotations }: CanvasProps) => {
  const { zoom } = useCanvasZoom()
  const { panOffset } = useCanvasPan()
  const { selectedTool } = useCanvasTool()

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  } = useCanvasHandlers(canvasRef, annotations, {
    updateAnnotation: async () => {}, // TODO: Add proper store methods
    deleteAnnotation: async () => {}
  }, { id: image.id })

  // Simplified canvas component - annotation creation handled elsewhere

  // Canvas ref is now passed directly to handlers
  const cursorStyles = {
    box: "cursor-crosshair",
    polygon: "cursor-crosshair",
    freeDraw: "cursor-crosshair",
    move: "cursor-move",
    delete: "cursor-pointer",
  }
  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
        <div className="relative h-full w-full overflow-hidden">
          {!image ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-500 dark:text-gray-300">
                  No image loaded
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={canvasRef}
              className={cn(
                "relative h-full w-full overflow-hidden",
                cursorStyles[selectedTool as keyof typeof cursorStyles] ||
                  "cursor-default"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              role="button"
            >
              <div
                className="absolute"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <img
                  src={image.data}
                  alt="Canvas"
                  className="pointer-events-none select-none"
                  draggable={false}
                  width={image.width}
                  height={image.height}
                  style={{
                    width: `${image.width}px`,
                    height: `${image.height}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    objectFit: 'none'
                  }}
                />
                <AnnotationRenderer annotations={annotations} /> 
              </div>

              <Crosshair canvasRef={canvasRef} />
              <PositionCoordinates />
            </div>
          )}
        </div>
      </div>
    </>
  )
})
