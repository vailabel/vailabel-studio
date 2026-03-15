import { memo, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers-context"
import { type Annotation, type ImageData } from "@/types/core"
import { Crosshair } from "@/components/canvas/crosshair-context"
import { useCanvasZoom, useCanvasPan, useCanvasTool, useCanvasContainer } from "@/contexts/canvas-context"
import { getCenterOffset } from "@/tools/canvas-utils"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
  onRefreshAnnotations?: () => Promise<void>
}

export const Canvas = memo(({ image, annotations, onRefreshAnnotations }: CanvasProps) => {
  const { zoom } = useCanvasZoom()
  const { panOffset } = useCanvasPan()
  const { selectedTool } = useCanvasTool()
  const { container, setContainer } = useCanvasContainer()

  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return
    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setContainer({ width: rect.width, height: rect.height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [setContainer])

  const centerOffset = useMemo(
    () =>
      getCenterOffset(
        container,
        { width: image.width, height: image.height },
        zoom
      ),
    [container, image.width, image.height, zoom]
  )

  const baseOffset = useMemo(
    () => ({
      x: centerOffset.x + panOffset.x,
      y: centerOffset.y + panOffset.y,
    }),
    [centerOffset.x, centerOffset.y, panOffset.x, panOffset.y]
  )
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  } = useCanvasHandlers(
    canvasRef,
    annotations,
    {
      updateAnnotation: async (id: string, updates: Partial<Annotation>) => {
        if (onRefreshAnnotations) {
          await onRefreshAnnotations()
        }
      },
      deleteAnnotation: async (id: string) => {
        if (onRefreshAnnotations) {
          await onRefreshAnnotations()
        }
      },
    },
    { id: image.id, width: image.width, height: image.height },
    {
      baseOffset,
      centerOffset,
      container,
      image: { width: image.width, height: image.height },
    }
  )

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
                  transform: `translate(${baseOffset.x}px, ${baseOffset.y}px) scale(${zoom})`,
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

              <Crosshair canvasRef={canvasRef} baseOffset={baseOffset} />
              <PositionCoordinates baseOffset={baseOffset} />
            </div>
          )}
        </div>
      </div>
    </>
  )
})

