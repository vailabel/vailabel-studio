import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useCanvas } from "@/contexts/canvas-context"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import { PositionCoordinates } from "@/components/canvas/position-coordinates"
import { useCanvasHandlers } from "@/hooks/use-canvas-handlers"
import { type Annotation, type ImageData } from "@/lib/types"
import { Crosshair } from "@/components/canvas/crosshair"
import { TempAnnotation } from "@/components/canvas/temp-annotation"
import { CreateAnnotation } from "@/components/canvas/create-annotation"
interface CanvasProps {
  image: ImageData | null
  annotations: Annotation[]
}

export const Canvas = ({ image }: CanvasProps) => {
  const { zoom, panOffset, selectedTool, setCanvasRef } = useCanvas()
  const canvasRef = useRef<HTMLDivElement>(null!) // Non-null assertion
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null)

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

  const cursorStyles = {
    box: "cursor-crosshair",
    polygon: "cursor-crosshair",
    move: "cursor-move",
    delete: "cursor-pointer",
  }

  useEffect(() => {
    const fetchImage = async () => {
      if (image) {
        setCurrentImage(image) // Use the image passed from props
      } else {
        setCurrentImage(null)
      }
    }

    fetchImage()
    setCanvasRef(canvasRef)
  }, [image, setCanvasRef])

  const handleCloseCreateAnnotationModal = useCallback(() => {
    setShowLabelInput(false)
    setTempAnnotation(null)
  }, [setShowLabelInput, setTempAnnotation])

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
        <div
          className="relative h-full w-full overflow-hidden"
          onWheel={handleWheel}
        >
          {!currentImage ? (
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
            >
              <div
                className="absolute"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <img
                  src={currentImage.data}
                  alt="Canvas"
                  className="pointer-events-none select-none"
                  draggable={false}
                  width={currentImage.width}
                  height={currentImage.height}
                />
                <AnnotationRenderer />
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
      {showLabelInput && (
        <CreateAnnotation
          onSubmit={() => {}}
          isOpen={true}
          onClose={handleCloseCreateAnnotationModal}
        />
      )}
    </>
  )
}
