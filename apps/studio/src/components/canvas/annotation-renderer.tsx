import { memo, useMemo } from "react"
import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { FreeDrawAnnotation } from "@/components/canvas/free-draw-annotation"
import { TempAnnotation } from "@/components/canvas/temp-annotation"
import { Annotation } from "@vailabel/core"

type AnnotationType = "box" | "polygon" | "freeDraw"

type RenderableAnnotation = Annotation | Partial<Annotation>

// Memoized annotation component to prevent unnecessary re-renders
const MemoizedAnnotation = memo(({ 
  annotation, 
  AnnotationComponent 
}: { 
  annotation: Annotation
  AnnotationComponent: React.ComponentType<{ annotation: Annotation }>
}) => (
  <AnnotationComponent annotation={annotation} />
))

MemoizedAnnotation.displayName = "MemoizedAnnotation"

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

    // Filter out invalid annotations early to avoid processing them
    const validAnnotations = useMemo(() => 
      annotations.filter(annotation => 
        annotation.type && 
        annotation.coordinates && 
        annotation.coordinates.length > 0
      ), [annotations]
    )

    return (
      <>
        {validAnnotations.map((annotation, idx) => {
          // Use annotation.id if present, otherwise fallback to idx
          const key = (annotation as Annotation).id || idx
          
          if (isTemporary) {
            // Use TempAnnotation for temp/partial annotation rendering
            return <TempAnnotation key={key} annotation={annotation} />
          }
          
          const type = annotation.type as AnnotationType
          const AnnotationComponent = annotationComponents[type]
          
          if (!AnnotationComponent) return null
          
          return (
            <MemoizedAnnotation
              key={key}
              annotation={annotation as Annotation}
              AnnotationComponent={AnnotationComponent}
            />
          )
        })}
      </>
    )
  }
)
