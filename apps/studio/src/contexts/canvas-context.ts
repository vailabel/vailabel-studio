import { createContext } from "react"
import type { CanvasContextType } from "./canvas-context-provider"

export const CanvasContext = createContext<CanvasContextType | null>(null)
