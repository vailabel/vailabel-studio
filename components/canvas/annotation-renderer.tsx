import { motion } from "framer-motion"
import { cn, rgbToRgba } from "@/lib/utils"
import type { Annotation } from "@/lib/types"
import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"

interface AnnotationRendererProps {
  annotations: Annotation[]
  selectedLabelId: string | null
  selectedTool: string
  uiZoom: number
}

export function AnnotationRenderer({
  annotations,
  selectedLabelId,
  selectedTool,
  uiZoom,
}: AnnotationRendererProps) {
  return (
    <>
      {annotations.map((annotation: Annotation) => (
        <div key={annotation.id}>
          {annotation.type === "box" && (
            <BoxAnnotation
              annotation={annotation}
              selectedLabelId={selectedLabelId}
              selectedTool={selectedTool}
            />
          )}

          {annotation.type === "polygon" && (
            <PolygonAnnotation
              annotation={annotation}
              selectedLabelId={selectedLabelId}
              selectedTool={selectedTool}
              uiZoom={uiZoom}
            />
          )}
        </div>
      ))}
    </>
  )
}
