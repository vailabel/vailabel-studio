import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { useAnnotations } from "@/contexts/annotations-context"

export function AnnotationRenderer() {
  const { annotations } =
    useAnnotations()


  return (
    <>
      {annotations.map((annotation) => (
        <div key={annotation.id}>
          {annotation.type === "box" && (
            <BoxAnnotation
              annotation={annotation}
            />
          )}

          {annotation.type === "polygon" && (
            <PolygonAnnotation/>
          )}
        </div>
      ))}
    </>
  )
}
