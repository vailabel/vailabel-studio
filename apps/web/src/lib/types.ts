export interface Point {
  x: number
  y: number
}

export interface Label {
  id: string
  name: string
  category?: string
  isAIGenerated?: boolean
  projectId: string
  color?: string
}

export interface Annotation {
  id: string
  labelId: string
  label?: Label // Made optional to avoid circular dependencies
  name: string
  type: "box" | "polygon" | "freeDraw"
  coordinates: Point[]
  imageId: string
  createdAt: Date
  updatedAt: Date
  color?: string
  isAIGenerated?: boolean
}

export interface History {
  labels: Label[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
}

export interface ImageData {
  id: string
  name: string
  data: string
  width: number
  height: number
  projectId: string
  createdAt: Date
}

export interface Project {
  id: string
  name: string
  images?: ImageData[] // Made optional to allow lazy loading
  createdAt: Date
  lastModified: Date
}

export interface ExportFormat {
  id: string
  name: string
  description: string
  extension: string
}

export interface AIModel {
  id: string
  name: string
  description: string
  isCustom: boolean
}
