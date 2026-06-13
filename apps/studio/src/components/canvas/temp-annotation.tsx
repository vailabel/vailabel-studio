import type { Annotation } from "@/types/core"
import { memo } from "react"
import {
  TempBoxAnnotation,
  TempPolygonAnnotation,
  TempFreeDrawAnnotation,
  TempPointAnnotation,
  TempLineAnnotation,
  TempLinestripAnnotation,
  TempCircleAnnotation,
} from "./temp-annotations"

interface TempAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempAnnotation = memo(({ annotation }: TempAnnotationProps) => {
  switch (annotation.type) {
    case "box":
      return <TempBoxAnnotation annotation={annotation} />
    case "polygon":
      return <TempPolygonAnnotation annotation={annotation} />
    case "freeDraw":
      return <TempFreeDrawAnnotation annotation={annotation} />
    case "point":
      return <TempPointAnnotation annotation={annotation} />
    case "line":
      return <TempLineAnnotation annotation={annotation} />
    case "linestrip":
      return <TempLinestripAnnotation annotation={annotation} />
    case "circle":
      return <TempCircleAnnotation annotation={annotation} />
    default:
      return null
  }
})

TempAnnotation.displayName = "TempAnnotation"

