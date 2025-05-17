import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useCanvas } from "@/hooks/use-canvas"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers"
import { type Annotation, type ImageData } from "@vailabel/core"
import { Crosshair } from "@/components/canvas/crosshair"
import { TempAnnotation } from "@/components/canvas/temp-annotation"
import { CreateAnnotation } from "@/components/canvas/create-annotation"
import { useAnnotations } from "@/hooks/use-annotations"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
}

export const Canvas = ({ image, annotations }: CanvasProps) => {
  const { zoom, panOffset, selectedTool, setCanvasRef } = useCanvas()
  const canvasRef = useRef<HTMLDivElement>(null!)
  const { createAnnotation, getOrCreateLabel } = useAnnotations()
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
    tempAnnotation,
    showLabelInput,
    setShowLabelInput,
    setTempAnnotation,
  } = useCanvasHandlers(canvasRef as React.RefObject<HTMLDivElement>)

  const handleCreateAnnotation = useCallback(
    async (name: string, color: string) => {
      if (!tempAnnotation) return
      const label = await getOrCreateLabel(name, color)
      if (!label) return
      const newAnnotation: Annotation = {
        label: label,
        labelId: label.id,
        color: label.color ?? color,
        imageId: image.id,
        id: crypto.randomUUID(),
        name: name,
        type: tempAnnotation?.type ?? "box",
        coordinates: tempAnnotation?.coordinates ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      createAnnotation(newAnnotation)
      setShowLabelInput(false)
      setTempAnnotation(null)
    },
    [
      tempAnnotation,
      getOrCreateLabel,
      image.id,
      createAnnotation,
      setShowLabelInput,
      setTempAnnotation,
    ]
  )

  const handleCloseCreateAnnotationModal = useCallback(() => {
    setShowLabelInput(false)
    setTempAnnotation(null)
  }, [setShowLabelInput, setTempAnnotation])

  useEffect(() => {
    setCanvasRef(canvasRef)
  }, [setCanvasRef])
  const cursorStyles = {
    box: "cursor-crosshair",
    polygon: "cursor-crosshair",
    move: "cursor-move",
    delete: "cursor-pointer",
  }
  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
        <div
          className="relative h-full w-full overflow-hidden"
          onWheel={handleWheel}
        >
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
                />
                <AnnotationRenderer annotations={annotations} />
                {tempAnnotation && (
                  <TempAnnotation annotation={tempAnnotation} />
                )}
              </div>

              <Crosshair />
              <PositionCoordinates />
            </div>
          )}
        </div>
      </div>
      <CreateAnnotation
        onSubmit={handleCreateAnnotation}
        isOpen={showLabelInput}
        onClose={handleCloseCreateAnnotationModal}
      />
    </>
  )
}
