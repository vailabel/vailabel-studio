/** Typed per-project configuration stored in the `config_json` column.
 *  Mirrors the Rust `ProjectConfig` struct — must stay in sync.
 *  All sections have sane defaults so callers never need to check for nulls. */

export type LabelDisplayMode = "name" | "color" | "both"
export type ExportFormat = "yolo" | "coco" | "labelme" | "csv"
export type CopilotVision = "auto" | "on" | "off"

export interface ProjectStorageConfig {
  /** References a CloudStorageConfig.id from global Cloud Connections. undefined = local only. */
  connectionId?: string
  /** Object-key prefix inside the bucket. undefined = default `projects/{id}/images/`. */
  prefix?: string
}

export interface ProjectGeneralConfig {
  autoSave: boolean
  /** Controls how label names/colors show in the annotation list and canvas. */
  labelDisplayMode: LabelDisplayMode
  snapToGrid: boolean
}

export interface ProjectExportConfig {
  defaultFormat: ExportFormat
  includeImages: boolean
  normalizeCoordinates: boolean
}

export interface ProjectAiConfig {
  defaultModelId?: string
  /** Confidence threshold for auto-label (0.0 – 1.0). */
  defaultConfidence: number
  copilotEnabled: boolean
  copilotVision: CopilotVision
}

export interface ProjectConfig {
  general: ProjectGeneralConfig
  export: ProjectExportConfig
  ai: ProjectAiConfig
  storage: ProjectStorageConfig
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  general: {
    autoSave: true,
    labelDisplayMode: "both",
    snapToGrid: false,
  },
  export: {
    defaultFormat: "yolo",
    includeImages: true,
    normalizeCoordinates: true,
  },
  ai: {
    defaultModelId: undefined,
    defaultConfidence: 0.25,
    copilotEnabled: true,
    copilotVision: "auto",
  },
  storage: {
    connectionId: undefined,
    prefix: undefined,
  },
}

/** Merge a partial config over the defaults, section by section. */
export function mergeProjectConfig(partial?: Partial<ProjectConfig> | null): ProjectConfig {
  if (!partial) return DEFAULT_PROJECT_CONFIG
  return {
    general: { ...DEFAULT_PROJECT_CONFIG.general, ...partial.general },
    export: { ...DEFAULT_PROJECT_CONFIG.export, ...partial.export },
    ai: { ...DEFAULT_PROJECT_CONFIG.ai, ...partial.ai },
    storage: { ...DEFAULT_PROJECT_CONFIG.storage, ...partial.storage },
  }
}
