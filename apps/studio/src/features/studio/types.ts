import type { Annotation, ImageData, Label, Prediction, Project } from "@/types/core"

export type CanvasTool = "move" | "box" | "polygon" | "freeDraw" | "delete"

export type CanvasHistoryKind = "create" | "update" | "delete"

export interface CanvasHistoryEntry {
  id: string
  annotationId: string
  kind: CanvasHistoryKind
  label: string
  before: Annotation | null
  after: Annotation | null
  createdAt: string
}

export interface CanvasSessionState {
  canUndo: boolean
  canRedo: boolean
  past: CanvasHistoryEntry[]
  future: CanvasHistoryEntry[]
}

export interface StudioHeaderStats {
  totalImages: number
  labeledImages: number
  totalLabels: number
}

export interface StudioProjectSummary {
  project: Project | null
  stats: StudioHeaderStats
}

export interface StudioScreenData {
  image: ImageData | null
  annotations: Annotation[]
  predictions: Prediction[]
  labels: Label[]
  isLoading: boolean
  error: unknown
}
