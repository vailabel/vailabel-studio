export class Point {
  x!: number
  y!: number
}

export class Project {
  id!: string
  name!: string
  labels!: Label[]
  images!: ImageData[]
  tasks!: Task[]
}

export class Label {
  id!: string
  name!: string
  category?: string
  isAIGenerated?: boolean
  projectId!: string
  project!: Project
  annotations!: Annotation[]
  color!: string
}

export class ImageData {
  id!: string
  name!: string
  data!: string
  width!: number
  height!: number
  url?: string
  projectId!: string
  project!: Project
  annotations!: Annotation[]
}

export class Annotation {
  id!: string
  labelId!: string
  label!: Label
  name!: string
  type!: string
  coordinates!: { x: number; y: number }[]
  imageId!: string
  image!: ImageData
  color?: string
  isAIGenerated?: boolean
}

export class History {
  id!: string
  labels!: Label[]
  historyIndex!: number
  canUndo!: boolean
  canRedo!: boolean
}

export class Task {
  id!: string
  name!: string
  description!: string
  projectId!: string
  project!: Project
  assignedTo?: string
  status!: string
  dueDate?: Date
  labels?: Label[]
  annotations?: Annotation[]
}

export class ExportFormat {
  id!: string
  name!: string
  description!: string
  extension!: string
}

export class AIModel {
  id!: string
  name!: string
  description!: string
  version!: string
  modelPath!: string
  configPath!: string
  modelSize!: number
  isCustom!: boolean
}

export class Settings {
  id!: string
  key!: string
  value!: string
}

export class User {
  id!: string
  email!: string
  name!: string
  password!: string
  role!: string
}
