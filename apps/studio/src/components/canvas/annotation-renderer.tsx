import { memo, useMemo } from "react"
import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { FreeDrawAnnotation } from "@/components/canvas/free-draw-annotation"
import { TempAnnotation } from "@/components/canvas/temp-annotation"
import { Annotation } from "@vailabel/core"

type AnnotationType = "box" | "polygon" | "freeDraw"

type RenderableAnnotation = Annotation | Partial<Annotation>

export const AnnotationRenderer = memo(
  ({
    annotations,
    isTemporary = false,
  }: {
    annotations: RenderableAnnotation[]
    isTemporary?: boolean
  }) => {
    const annotationComponents = useMemo(
      () => ({
        box: BoxAnnotation,
        polygon: PolygonAnnotation,
        freeDraw: FreeDrawAnnotation,
      }),
      []
    )

    return (
      <>
        {annotations.map((annotation, idx) => {
          // Skip if type or coordinates are missing or invalid
          if (
            !annotation.type ||
            !annotation.coordinates ||
            annotation.coordinates.length === 0
          )
            return null
          // Use annotation.id if present, otherwise fallback to idx
          const key = (annotation as Annotation).id || idx
          if (isTemporary) {
            // Use TempAnnotation for temp/partial annotation rendering
            return <TempAnnotation key={key} annotation={annotation} />
          }
          const type = annotation.type as AnnotationType
          const AnnotationComponent = annotationComponents[type] || null
          return AnnotationComponent ? (
            <AnnotationComponent key={key} annotation={annotation as Annotation} />
          ) : null
        })}
      </>
    )
  }
)
