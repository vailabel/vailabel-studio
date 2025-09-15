import { memo, useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers"
import { type Annotation, type ImageData } from "@vailabel/core"
import { Crosshair } from "@/components/canvas/crosshair"
import { CreateAnnotation } from "@/components/canvas/create-annotation"
import { useAnnotationsStore } from "@/stores/annotation-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { useLabelStore } from "@/stores/use-label-store"

interface CanvasProps {
  image: ImageData
  annotations: Annotation[]
}

export const Canvas = memo(({ image, annotations }: CanvasProps) => {
  const { zoom, panOffset, selectedTool, setCanvasRef } = useCanvasStore()
  const { createAnnotation } = useAnnotationsStore()
  const { getOrCreateLabel, labels } = useLabelStore()

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    tempAnnotation,
    showLabelInput,
    setShowLabelInput,
    setTempAnnotation,
  } = useCanvasHandlers()

  const handleCreateAnnotation = useCallback(
    async (name: string, color: string) => {
      if (!tempAnnotation) return
      if (!image.projectId) return
      const label = await getOrCreateLabel(name, color, image.projectId)
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
      image.projectId,
      image.id,
      getOrCreateLabel,
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
    freeDraw: "cursor-crosshair",
    move: "cursor-move",
    delete: "cursor-pointer",
  }

  console.log("Canvas rendered with image:", image.id)
  console.log("Annotations:", annotations.length)
  console.log("Selected tool:", selectedTool)
  console.log("Temp annotation:", tempAnnotation)

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
                className="absolute will-change-transform"
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
              </div>

              <Crosshair />
              <PositionCoordinates />
            </div>
          )}
        </div>
      </div>
      <CreateAnnotation
        labels={labels}
        onSubmit={handleCreateAnnotation}
        isOpen={showLabelInput}
        onClose={handleCloseCreateAnnotationModal}
      />
    </>
  )
})
