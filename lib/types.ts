export interface Point {
  x: number
  y: number
}

export interface Label {
  id: string
  name: string
  category?: string
  type: "box" | "polygon"
  coordinates: Point[]
  imageId: string
  createdAt: Date
  updatedAt: Date
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
