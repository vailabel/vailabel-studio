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
  imageId?: string
  image_id?: string
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
  modelPath!: string
  configPath!: string
  modelSize!: number
  isCustom!: boolean

  // New fields for frontend compatibility
  type?: string // e.g., "object_detection", "classification", "segmentation"
  status?: string // e.g., "active", "training", "deployed", "failed", "inactive"
  category?: string // e.g., "detection", "classification", "segmentation"
  isActive?: boolean // Currently active model
  lastUsed?: Date // When the model was last used
  modelMetadata?: Record<string, any> // Additional metadata like accuracy, speed, etc.

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

export class Permission {
  id!: string
  name!: string
  description?: string
  resource!: string
  action!: string
  createdAt?: Date
  updatedAt?: Date
}

export class Role {
  id!: string
  name!: string
  description?: string
  permissions?: Permission[]
  createdAt?: Date
  updatedAt?: Date
}

export class User {
  id!: string
  email!: string
  name!: string
  password!: string
  role!: string
  roleId?: string
  roleObj?: Role
  roles?: string[]
  permissions?: string[]
  userPermissions?: Permission[]
  token?: string
  createdAt?: Date
  updatedAt?: Date
}
