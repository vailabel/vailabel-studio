import { memo, useMemo } from "react"
import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { Annotation } from "@vailabel/core"

type AnnotationType = "box" | "polygon" | "freeDraw"

export const AnnotationRenderer = memo(
  ({ annotations }: { annotations: Annotation[] }) => {
    const annotationComponents = useMemo(
      () => ({
        box: BoxAnnotation,
        polygon: PolygonAnnotation,
        freeDraw: () => null, // Handle unsupported type gracefully
      }),
      []
    )

    return (
      <>
        {annotations.map((annotation) => {
          const type = annotation.type as AnnotationType
          const AnnotationComponent = annotationComponents[type] || null
          return (
            <div key={annotation.id}>
              {AnnotationComponent && (
                <AnnotationComponent annotation={annotation} />
              )}
            </div>
          )
        })}
      </>
    )
  }
)
