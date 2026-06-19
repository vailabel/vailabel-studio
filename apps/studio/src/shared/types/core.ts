import type { Modality, Task, AnnotationMeta } from "./modality"
import type { ProjectConfig } from "./project-config"

export class Point {
  x!: number
  y!: number
}

export class Project {
  id!: string
  name!: string
  description?: string
  /** Legacy single-axis type, kept for back-compat (e.g. "object_detection"). */
  type!: string
  /** Coarse data type of the project's items. Derived from `type` for old projects. */
  modality?: Modality
  /** Labeling task within the modality. Derived from `type` for old projects. */
  task?: Task
  status!: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
  /** Typed per-project settings (config_json column). Separate from the legacy settings blob. */
  config?: ProjectConfig
  labels?: Label[]
  images?: Item[]
  /** Derived count of images in the project (from list/get queries). */
  itemCount?: number
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

export class Item {
  id!: string
  name!: string
  /** Absolute on-disk path to the referenced image file (never base64). */
  path!: string
  /** Path relative to the opened folder, used for LabelMe JSON sidecars. */
  imagePath?: string
  width!: number
  height!: number
  url?: string
  /** LabelMe-style boolean flags for the whole image (e.g. {blurry: true}). */
  flags?: Record<string, boolean>
  /** Inline task data for non-file items: a spreadsheet row's column values
   *  keyed by header. Set for tabular projects; undefined for file-backed
   *  assets (images, audio, text documents). */
  data?: Record<string, unknown>
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
  /** Optional group id (LabelMe) linking related shapes. */
  groupId?: number | null
  group_id?: number | null
  /** LabelMe-style boolean flags for this shape. */
  flags?: Record<string, boolean>
  /** Typed non-spatial payload (text span, audio range, mask RLE, video frame). */
  meta?: AnnotationMeta
  projectId?: string
  project_id?: string
  project?: Project
  itemId?: string
  item_id?: string
  image?: Item
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
  itemId?: string
  item_id?: string
  projectId?: string
  project_id?: string
  color?: string
  isAIGenerated?: boolean
  backend?: string
  inferenceMs?: number
  modelVersion?: string
  model_version?: string
  family?: string
  variant?: string
  fromName?: string
  from_name?: string
  toName?: string
  to_name?: string
  resultType?: string
  result_type?: string
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
  backend?: string
  framework?: string
  labelsPath?: string
  stride?: number
  family?: string
  variant?: string
  defaultRank?: number
  supportsLabelStudioFormat?: boolean
  taskType?: string
  modelVersion?: string
  model_version?: string
  modelMetadata?: AIModelMetadata
  createdAt?: Date
  updatedAt?: Date
}

export type AIModelMetadata = {
  classNames?: string[]
  classCount?: number
  labelSource?: string
  supportsPrediction?: boolean
  unsupportedReason?: string | null
  [key: string]: unknown
}

export class LabelStudioResult {
  id!: string
  from_name!: string
  to_name!: string
  type!: string
  value!: Record<string, unknown>
  score?: number
  readonly?: boolean
  hidden?: boolean
}

export class LabelStudioPrediction {
  model_version!: string
  score?: number
  result!: LabelStudioResult[]
}

export class LabelStudioTask {
  data!: Record<string, unknown>
  predictions!: LabelStudioPrediction[]
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
  itemId?: string
  item_id?: string
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

/** An extra file for a multi-file model download (SAM decoder, tokenizer, …),
 *  fetched into the same model directory as the primary asset. */
export interface ModelComponent {
  fileName?: string
  url: string
}

export class ModelInstallPayload {
  name!: string
  description!: string
  version!: string
  category!: string
  type!: string
  taskType?: string
  downloadUrl!: string
  fileName?: string
  projectId?: string
  project_id?: string
  /** Extra files for multi-file models (encoder + decoder, model + tokenizer). */
  components?: ModelComponent[]
}
