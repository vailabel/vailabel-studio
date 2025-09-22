import React from "react"
import { CanvasProvider } from "@/contexts/canvas-context"
import { Canvas } from "./canvas"
import type { Annotation, ImageData } from "@vailabel/core"

interface CanvasWithProviderProps {
  image: ImageData
  annotations: Annotation[]
}

export const CanvasWithProvider: React.FC<CanvasWithProviderProps> = ({ image, annotations }) => {
  return (
    <CanvasProvider>
      <Canvas image={image} annotations={annotations} />
    </CanvasProvider>
  )
}
