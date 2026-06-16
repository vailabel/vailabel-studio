import { memo, useMemo } from "react"
import { useCanvasSelection } from "@/contexts/canvas-context"
import { BoxAnnotation } from "@/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/components/canvas/polygon-annotation"
import { FreeDrawAnnotation } from "@/components/canvas/free-draw-annotation"
import { PointAnnotation } from "@/components/canvas/point-annotation"
import { LineAnnotation } from "@/components/canvas/line-annotation"
import { LinestripAnnotation } from "@/components/canvas/linestrip-annotation"
import { CircleAnnotation } from "@/components/canvas/circle-annotation"
import { TempAnnotation } from "@/components/canvas/temp-annotation"
import { Annotation } from "@/types/core"

type AnnotationType =
  | "box"
  | "polygon"
  | "freeDraw"
  | "point"
  | "line"
  | "linestrip"
  | "circle"

type RenderableAnnotation = Annotation | Partial<Annotation>

// Memoized annotation component to prevent unnecessary re-renders.
// `isSelected` is passed in (computed once in AnnotationRenderer) rather than
// read from context inside each shape, so a selection change re-renders only the
// shapes whose `isSelected` actually flipped — not every annotation on screen.
const MemoizedAnnotation = memo(({
  annotation,
  AnnotationComponent,
  readOnly = false,
  isSelected = false,
  onUpdateAnnotation,
}: {
  annotation: Annotation
  AnnotationComponent: React.ComponentType<{
    annotation: Annotation
    readOnly?: boolean
    isSelected?: boolean
    onUpdateAnnotation?: (
      annotationId: string,
      updates: Partial<Annotation>
    ) => Promise<void>
  }>
  readOnly?: boolean
  isSelected?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
}) => (
  <AnnotationComponent
    annotation={annotation}
    readOnly={readOnly}
    isSelected={isSelected}
    onUpdateAnnotation={onUpdateAnnotation}
  />
))

MemoizedAnnotation.displayName = "MemoizedAnnotation"

export const AnnotationRenderer = memo(
  ({
    annotations,
    isTemporary = false,
    readOnly = false,
    onUpdateAnnotation,
  }: {
    annotations: RenderableAnnotation[]
    isTemporary?: boolean
    readOnly?: boolean
    onUpdateAnnotation?: (
      annotationId: string,
      updates: Partial<Annotation>
    ) => Promise<void>
  }) => {
    const { selectedAnnotation } = useCanvasSelection()
    const selectedId = isTemporary ? undefined : selectedAnnotation?.id

    const annotationComponents = useMemo(
      () => ({
        box: BoxAnnotation,
        polygon: PolygonAnnotation,
        freeDraw: FreeDrawAnnotation,
        point: PointAnnotation,
        line: LineAnnotation,
        linestrip: LinestripAnnotation,
        circle: CircleAnnotation,
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
              readOnly={readOnly}
              isSelected={(annotation as Annotation).id === selectedId}
              onUpdateAnnotation={onUpdateAnnotation}
            />
          )
        })}
      </>
    )
  }
)

