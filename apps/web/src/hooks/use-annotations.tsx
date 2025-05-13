
import { AnnotationsContext } from "@/contexts/annotations-context"
import { useContext } from "react"

export const useAnnotations = () => {
  const context = useContext(AnnotationsContext)
  if (!context) {
    throw new Error("useAnnotations must be used within AnnotationsProvider")
  }
  return context
}
