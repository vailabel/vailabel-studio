import type { Annotation } from "@vailabel/core"
import { memo } from "react"
import {
  TempBoxAnnotation,
  TempPolygonAnnotation,
  TempFreeDrawAnnotation,
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
    default:
      return null
  }
})

TempAnnotation.displayName = "TempAnnotation"
