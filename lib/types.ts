export interface Point {
  x: number
  y: number
}

export interface Label {
  id: string
  name: string
  category?: string
  type: "box" | "polygon" | "freeDraw"
  coordinates: Point[]
  imageId: string
  createdAt: Date
  updatedAt: Date
  isAIGenerated?: boolean
  color?: string
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
  images: ImageData[]
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
