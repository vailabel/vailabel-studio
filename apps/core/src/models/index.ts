export class Point {
  x!: number
  y!: number
}

export class Project {
  id!: string
  name!: string
  labels?: Label[]
  images?: ImageData[]
  tasks?: Task[]
  createdAt?: Date
  updatedAt?: Date
}

export class Label {
  id!: string
  name!: string
  category?: string
  isAIGenerated?: boolean
  projectId?: string
  project?: Project
  annotations?: Annotation[]
  color!: string
  createdAt?: Date
  updatedAt?: Date
}

export class ImageData {
  id!: string
  name!: string
  data!: string
  width!: number
  height!: number
  url?: string
  projectId?: string
  project?: Project
  annotations?: Annotation[]
  createdAt?: Date
  updatedAt?: Date
}

export class Annotation {
  id!: string
  labelId?: string
  label?: Label
  name!: string
  type!: string
  coordinates!: { x: number; y: number }[]
  imageId?: string
  image?: ImageData
  color?: string
  isAIGenerated?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class History {
  id!: string
  labels?: Label[]
  historyIndex!: number
  canUndo!: boolean
  canRedo!: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Task {
  id!: string
  name!: string
  description!: string
  projectId?: string
  project?: Project
  assignedTo?: string
  status!: string
  dueDate?: Date
  labels?: Label[]
  annotations?: Annotation[]
  createdAt?: Date
  updatedAt?: Date
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
  createdAt?: Date
  updatedAt?: Date
}

export class Settings {
  id!: string
  key!: string
  value!: string
  createdAt?: Date
  updatedAt?: Date
}

export class User {
  id!: string
  email!: string
  name!: string
  password!: string
  role!: string
  createdAt?: Date
  updatedAt?: Date
}
