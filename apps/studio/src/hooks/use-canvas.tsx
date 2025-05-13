import { useContext } from "react"
import { CanvasContext } from "@/contexts/canvas-context-provider"

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (!context) throw new Error("useCanvas must be used within CanvasProvider")
  return context
}
