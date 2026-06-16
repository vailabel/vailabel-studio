import { memo, useMemo } from "react"
import { useCanvasSelection } from "@/features/studio/canvas-state/canvas-context"
import { useHiddenRegions } from "@/features/studio/canvas-state/use-region-visibility"
import { BoxAnnotation } from "@/features/studio/components/canvas/box-annotation"
import { PolygonAnnotation } from "@/features/studio/components/canvas/polygon-annotation"
import { FreeDrawAnnotation } from "@/features/studio/components/canvas/free-draw-annotation"
import { PointAnnotation } from "@/features/studio/components/canvas/point-annotation"
import { LineAnnotation } from "@/features/studio/components/canvas/line-annotation"
import { LinestripAnnotation } from "@/features/studio/components/canvas/linestrip-annotation"
import { CircleAnnotation } from "@/features/studio/components/canvas/circle-annotation"
import { TempAnnotation } from "@/features/studio/components/canvas/temp-annotation"
import { Annotation } from "@/shared/types/core"

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
    ) => Promise<unknown>
  }>
  readOnly?: boolean
  isSelected?: boolean
  onUpdateAnnotation?: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<unknown>
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
    ) => Promise<unknown>
  }) => {
    const { selectedAnnotation } = useCanvasSelection()
    const hiddenRegions = useHiddenRegions()
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

    // Filter out invalid annotations early to avoid processing them, and drop
    // any the user has hidden via the Regions panel eye toggle (persisted shapes
    // only — temp/in-progress annotations have no id and are always shown).
    const validAnnotations = useMemo(() =>
      annotations.filter(annotation =>
        annotation.type &&
        annotation.coordinates &&
        annotation.coordinates.length > 0 &&
        !(!isTemporary && hiddenRegions.has((annotation as Annotation).id))
      ), [annotations, hiddenRegions, isTemporary]
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

