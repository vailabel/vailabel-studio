/// <reference path='../../../type.d.ts' />
import {
  Project,
  ImageData,
  Annotation,
  Label,
  History,
  AIModel,
  Settings,
} from "../../../models/types"
import { IDataAccess } from "../../contracts/IDataAccess"

export class SQLiteDataAccess implements IDataAccess<any> {
  protected table: string

  constructor(table: string) {
    this.table = table
  }

  // Generic CRUD methods
  async get<T>(): Promise<T[]> {
    return window.ipc.invoke("sqlite:all", [`SELECT * FROM ${this.table}`, []])
  }

  async getById<T>(id: string): Promise<T | null> {
    const row = await window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE id = ?`,
      [id],
    ])
    return row || null
  }

  async create<T extends object>(item: T): Promise<void> {
    const flatItem: Record<string, any> = {}

    for (const [key, value] of Object.entries(item)) {
      if (key === "JsonData") {
        flatItem[key] = JSON.stringify(value)
      } else if (
        typeof value !== "object" || // Keep primitives
        value === null || // Allow null
        value instanceof Date // Allow Date if needed
      ) {
        flatItem[key] = value
      }
    }

    const keys = Object.keys(flatItem)
    const values = Object.values(flatItem)
    const placeholders = keys.map(() => "?").join(", ")

    const sql = `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${placeholders})`

    await window.ipc.invoke("sqlite:run", [sql, values])
  }

  async update<T>(id: string, updates: Partial<T>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    await window.ipc.invoke("sqlite:run", [
      `UPDATE ${this.table} SET ${setClause} WHERE id = ?`,
      [...values, id],
    ])
  }

  async delete(id: string): Promise<void> {
    await window.ipc.invoke("sqlite:run", [
      `DELETE FROM ${this.table} WHERE id = ?`,
      [id],
    ])
  }

  async paginate<T>(offset: number, limit: number): Promise<T[]> {
    return window.ipc.invoke("sqlite:all", [
      `SELECT * FROM ${this.table} LIMIT ? OFFSET ?`,
      [limit, offset],
    ])
  }

  getLabelsByProjectId(projectId: string): Promise<Label[]> {
    return window.ipc.invoke("sqlite:all", [
      "SELECT * FROM labels WHERE projectId = ?",
      [projectId],
    ])
  }
  getAnnotationsByImageId(imageId: string): Promise<Annotation[]> {
    return window.ipc.invoke("sqlite:all", [
      "SELECT * FROM annotations WHERE imageId = ?",
      [imageId],
    ])
  }
  async getAvailableModels(): Promise<AIModel[]> {
    const rows =
      (await window.ipc.invoke("sqlite:all", [
        "SELECT * FROM ai_models",
        [],
      ])) || []
    if (!Array.isArray(rows)) {
      console.error("Expected array from sqlite:all, got:", rows)
      return []
    }
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      modelPath: row.modelPath,
      configPath: row.configPath,
      modelSize: row.modelSize,
      isCustom: !!row.isCustom,
    }))
  }

  async uploadCustomModel(model: AIModel): Promise<void> {
    console.log("Uploading custom model:", model)
    await window.ipc.invoke("sqlite:run", [
      `INSERT OR REPLACE INTO ai_models (id, name, description, version, createdAt, updatedAt, modelPath, configPath, modelSize, isCustom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model.id,
        model.name,
        model.description,
        model.version,
        model.createdAt.toISOString(),
        model.updatedAt.toISOString(),
        model.modelPath,
        model.configPath,
        model.modelSize,
        model.isCustom ? 1 : 0,
      ],
    ])
  }

  async selectModel(modelId: string): Promise<void> {
    await window.ipc.invoke("sqlite:run", [
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      ["selectedModelId", modelId],
    ])
  }

  async getSelectedModel(): Promise<AIModel | undefined> {
    const row = (await window.ipc.invoke("sqlite:get", [
      "SELECT value FROM settings WHERE key = ?",
      ["selectedModelId"],
    ])) as { value?: string } | undefined
    if (!row?.value) return undefined
    const model = await window.ipc.invoke("sqlite:get", [
      "SELECT * FROM ai_models WHERE id = ?",
      [row.value],
    ])
    if (!model) return undefined
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      version: model.version,
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt),
      modelPath: model.modelPath,
      configPath: model.configPath,
      modelSize: model.modelSize,
      isCustom: !!model.isCustom,
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    await window.ipc.invoke("sqlite:run", [
      "DELETE FROM ai_models WHERE id = ?",
      [modelId],
    ])
    const selected = (await window.ipc.invoke("sqlite:get", [
      "SELECT value FROM settings WHERE key = ?",
      ["selectedModelId"],
    ])) as { value?: string } | undefined
    if (selected?.value === modelId) {
      await window.ipc.invoke("sqlite:run", [
        "DELETE FROM settings WHERE key = ?",
        ["selectedModelId"],
      ])
    }
  }

  async getProjectWithImages(
    id: string
  ): Promise<(Project & { images: ImageData[] }) | undefined> {
    const project = (await window.ipc.invoke("sqlite:get", [
      "SELECT * FROM projects WHERE id = ?",
      [id],
    ])) as Project | undefined
    if (!project) return undefined
    const images = (await window.ipc.invoke("sqlite:all", [
      "SELECT * FROM images WHERE projectId = ?",
      [id],
    ])) as ImageData[]
    return { ...project, images }
  }
  getProjectById(id: string): Promise<Project | undefined> {
    return window.ipc.invoke("sqlite:get", [
      "SELECT * FROM projects WHERE id = ?",
      [id],
    ])
  }

  createProject(project: Project): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "INSERT INTO projects (id, name, createdAt, lastModified) VALUES (?, ?, ?, ?)",
      [project.id, project.name, project.createdAt, project.lastModified],
    ])
  }

  updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return window.ipc.invoke("sqlite:run", [
      `UPDATE projects SET ${setClause} WHERE id = ?`,
      [...values, id],
    ])
  }

  async deleteProject(id: string): Promise<void> {
    // Delete annotations for all images in the project
    const images: ImageData[] = await window.ipc.invoke("sqlite:all", [
      "SELECT id FROM images WHERE projectId = ?",
      [id],
    ])
    const imageIds = images.map((img) => img.id)
    if (imageIds.length > 0) {
      // Delete annotations for these images
      await window.ipc.invoke("sqlite:run", [
        `DELETE FROM annotations WHERE imageId IN (${imageIds.map(() => "?").join(",")})`,
        imageIds,
      ])
    }
    // Delete images for the project
    await window.ipc.invoke("sqlite:run", [
      "DELETE FROM images WHERE projectId = ?",
      [id],
    ])
    // Delete labels for the project
    await window.ipc.invoke("sqlite:run", [
      "DELETE FROM labels WHERE projectId = ?",
      [id],
    ])
    // Delete the project itself
    await window.ipc.invoke("sqlite:run", [
      "DELETE FROM projects WHERE id = ?",
      [id],
    ])
  }

  getImages(projectId: string): Promise<ImageData[]> {
    return window.ipc.invoke("sqlite:all", [
      "SELECT * FROM images WHERE projectId = ?",
      [projectId],
    ])
  }

  getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return window.ipc.invoke("sqlite:all", [
      "SELECT * FROM images WHERE projectId = ? LIMIT ? OFFSET ?",
      [projectId, limit, offset],
    ])
  }

  getNextImageId(currentImageId: string): Promise<string | null> {
    return window.ipc
      .invoke("sqlite:get", [
        "SELECT id FROM images WHERE id > ? ORDER BY id ASC LIMIT 1",
        [currentImageId],
      ])
      .then((row: { id: string } | undefined) => (row ? row.id : null))
  }

  getPreviousImageId(currentImageId: string): Promise<string | null> {
    return window.ipc
      .invoke("sqlite:get", [
        "SELECT id FROM images WHERE id < ? ORDER BY id DESC LIMIT 1",
        [currentImageId],
      ])
      .then((row: { id: string } | undefined) => (row ? row.id : null))
  }

  createImage(image: ImageData): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "INSERT INTO images (id, projectId, name, data, width, height, url, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        image.id,
        image.projectId,
        image.name,
        image.data,
        image.width,
        image.height,
        image.url,
        image.createdAt,
      ],
    ])
  }

  updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return window.ipc.invoke("sqlite:run", [
      `UPDATE images SET ${setClause} WHERE id = ?`,
      [...values, id],
    ])
  }

  deleteImage(id: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "DELETE FROM images WHERE id = ?",
      [id],
    ])
  }

  getAnnotations(imageId: string): Promise<Annotation[]> {
    const result = window.ipc.invoke("sqlite:all", [
      "SELECT * FROM annotations WHERE imageId = ?",
      [imageId],
    ])
    result.then((rows: Annotation[]) => {
      rows.forEach((row) => {
        if (row.coordinates && typeof row.coordinates === "string") {
          try {
            row.coordinates = JSON.parse(row.coordinates)
          } catch (e) {
            console.error("Failed to parse coordinates:", e)
          }
        }
      })
    })
    return result
  }

  getAnnotationsWithFilter(
    imageId: string,
    filter: Partial<Annotation>
  ): Promise<Annotation[]> {
    const whereClause = Object.keys(filter)
      .map((key) => `${key} = ?`)
      .join(" AND ")
    const values = Object.values(filter)
    return window.ipc.invoke("sqlite:all", [
      `SELECT * FROM annotations WHERE imageId = ? AND ${whereClause}`,
      [imageId, ...values],
    ])
  }

  createAnnotation(annotation: Annotation): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "INSERT INTO annotations (id, imageId, labelId, name, type, coordinates, color, isAIGenerated, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        annotation.id,
        annotation.imageId,
        annotation.labelId,
        annotation.name,
        annotation.type,
        JSON.stringify(annotation.coordinates),
        annotation.color,
        annotation.isAIGenerated,
        annotation.createdAt,
        annotation.updatedAt,
      ],
    ])
  }

  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.keys(updates).map((key) =>
      key === "coordinates" && updates.coordinates !== undefined
        ? JSON.stringify(updates.coordinates)
        : (updates as any)[key]
    )
    return window.ipc.invoke("sqlite:run", [
      `UPDATE annotations SET ${setClause} WHERE id = ?`,
      [...values, id],
    ])
  }

  deleteAnnotation(id: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "DELETE FROM annotations WHERE id = ?",
      [id],
    ])
  }

  createLabel(label: Label): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "INSERT INTO labels (id, name, category, isAIGenerated, projectId, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        label.id,
        label.name,
        label.category,
        label.isAIGenerated,
        label.projectId,
        label.color,
        label.createdAt,
        label.updatedAt,
      ],
    ])
  }

  getLabels(): Promise<Label[]> {
    return window.ipc.invoke("sqlite:all", ["SELECT * FROM labels", []])
  }

  getLabelById(id: string): Promise<Label | undefined> {
    return window.ipc.invoke("sqlite:get", [
      "SELECT * FROM labels WHERE id = ?",
      [id],
    ])
  }

  updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return window.ipc.invoke("sqlite:run", [
      `UPDATE labels SET ${setClause} WHERE id = ?`,
      [...values, id],
    ])
  }

  deleteLabel(id: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "DELETE FROM labels WHERE id = ?",
      [id],
    ])
  }

  getSettings(): Promise<Settings[]> {
    return window.ipc.invoke("sqlite:all", ["SELECT * FROM settings", []])
  }

  getSetting(key: string): Promise<Settings | undefined> {
    return window.ipc.invoke("sqlite:get", [
      "SELECT * FROM settings WHERE key = ?",
      [key],
    ])
  }

  updateSetting(key: string, value: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [key, value],
    ])
  }

  getHistory(): Promise<History[]> {
    return window.ipc.invoke("sqlite:all", ["SELECT * FROM history", []])
  }

  updateHistory(history: History): Promise<void> {
    const setClause = Object.keys(history)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(history)
    return window.ipc.invoke("sqlite:run", [
      `UPDATE history SET ${setClause} WHERE id = ?`,
      [...values, history.id],
    ])
  }

  getProjects(): Promise<Project[]> {
    return window.ipc.invoke("sqlite:all", ["SELECT * FROM projects", []])
  }
}
