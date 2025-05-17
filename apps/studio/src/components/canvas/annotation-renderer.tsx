import React, { useMemo } from "react"
import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { Annotation } from "@vailabel/core"

export const AnnotationRenderer = React.memo(function AnnotationRenderer({
  annotations,
}: {
  annotations: Annotation[]
}) {
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
        const AnnotationComponent =
          annotationComponents[annotation.type] || null
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
})
