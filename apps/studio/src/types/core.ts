export class Point {
  x!: number
  y!: number
}

export class Project {
  id!: string
  name!: string
  description?: string
  type!: string
  status!: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
  labels?: Label[]
  images?: ImageData[]
  tasks?: Task[]
  createdAt?: Date
  updatedAt?: Date
}

export class Label {
  id!: string
  name!: string
  description?: string
  category?: string
  isAIGenerated?: boolean
  projectId?: string
  project_id?: string
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
  project_id?: string
  project?: Project
  annotations?: Annotation[]
  createdAt?: Date
  updatedAt?: Date
}

export class Annotation {
  id!: string
  labelId?: string
  label_id?: string
  label?: Label
  name!: string
  type!: string
  coordinates!: { x: number; y: number }[]
  projectId?: string
  project_id?: string
  project?: Project
  imageId?: string
  image_id?: string
  image?: ImageData
  color?: string
  isAIGenerated?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Prediction {
  id!: string
  labelId?: string
  label_id?: string
  labelName?: string
  label_name?: string
  labelColor?: string
  label_color?: string
  modelId?: string
  model_id?: string
  name!: string
  type!: string
  coordinates!: { x: number; y: number }[]
  confidence!: number
  imageId?: string
  image_id?: string
  projectId?: string
  project_id?: string
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
  projectId?: string
  project_id?: string
  project?: Project
  createdAt?: Date
  updatedAt?: Date
}

export class Task {
  id!: string
  name!: string
  description!: string
  projectId?: string
  project_id?: string
  project?: Project
  assignedTo?: string
  assigned_to?: string
  status!: string
  dueDate?: Date
  due_date?: Date
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
  projectId?: string
  project_id?: string
  modelPath!: string
  configPath!: string
  modelSize!: number
  isCustom!: boolean
  type?: string
  status?: string
  category?: string
  isActive?: boolean
  lastUsed?: Date
  modelMetadata?: Record<string, any>
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

export class StudioDomainEvent {
  entity!: string
  action!: string
  id!: string
  projectId?: string
  project_id?: string
  imageId?: string
  image_id?: string
  occurredAt!: Date | string
}

export class ModelImportPayload {
  name!: string
  description!: string
  version!: string
  category!: string
  type!: string
  modelFilePath!: string
  configFilePath?: string
  projectId?: string
  project_id?: string
}
