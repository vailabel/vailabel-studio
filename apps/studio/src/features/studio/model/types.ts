import type { Annotation, Item, Label, Prediction, Project } from "@/shared/types/core"

export type CanvasTool =
  | "move"
  | "box"
  | "polygon"
  | "freeDraw"
  | "point"
  | "line"
  | "linestrip"
  | "circle"
  | "smartSegment"
  | "delete"

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
  totalItems: number
  labeledItems: number
  totalLabels: number
}

export interface StudioProjectSummary {
  project: Project | null
  stats: StudioHeaderStats
}

export interface StudioScreenData {
  image: Item | null
  annotations: Annotation[]
  predictions: Prediction[]
  labels: Label[]
  isLoading: boolean
  error: unknown
}
