import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { useAnnotations } from "@/hooks/use-annotations"

export function AnnotationRenderer() {
  const { annotations } = useAnnotations()
  const annotationComponents: Record<string, React.ElementType> = {
    box: BoxAnnotation,
    polygon: PolygonAnnotation,
  }

  return (
    <>
      {annotations.map((annotation) => {
        const AnnotationComponent = annotationComponents[annotation.type]
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
