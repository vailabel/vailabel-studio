// SQLiteDataAccess.ts (pseudo-code using sqlite3 in Electron)
import { Database } from "sqlite3"
import { IDataAccess } from "@/data/interface/IDataAccess"
import { Project, ImageData, Annotation, Label, History } from "@/models/types"

export class SQLiteDataAccess implements IDataAccess {
  private db: Database

  constructor(filePath: string) {
    this.db = new Database(filePath)
  }
  private runAsync(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err: unknown) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  private getAsync<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: unknown, row: T) => {
        if (err) return reject(err)
        resolve(row)
      })
    })
  }

  private allAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: unknown, rows: T[]) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
  }

  getProjectById(id: string): Promise<Project | undefined> {
    return this.getAsync<Project>("SELECT * FROM projects WHERE id = ?", [id])
  }

  createProject(project: Project): Promise<void> {
    return this.runAsync(
      "INSERT INTO projects (id, name, createdAt, lastModified) VALUES (?, ?, ?, ?)",
      [project.id, project.name, project.createdAt, project.lastModified]
    )
  }

  updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return this.runAsync(`UPDATE projects SET ${setClause} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  deleteProject(id: string): Promise<void> {
    return this.runAsync("DELETE FROM projects WHERE id = ?", [id])
  }

  getImages(projectId: string): Promise<ImageData[]> {
    return this.allAsync<ImageData>(
      "SELECT * FROM images WHERE projectId = ?",
      [projectId]
    )
  }

  getImagesWithPagination(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<ImageData[]> {
    return this.allAsync<ImageData>(
      "SELECT * FROM images WHERE projectId = ? LIMIT ? OFFSET ?",
      [projectId, limit, offset]
    )
  }

  getNextImageId(currentImageId: string): Promise<string | null> {
    return this.getAsync<{ id: string }>(
      "SELECT id FROM images WHERE id > ? ORDER BY id ASC LIMIT 1",
      [currentImageId]
    ).then((row) => (row ? row.id : null))
  }

  getPreviousImageId(currentImageId: string): Promise<string | null> {
    return this.getAsync<{ id: string }>(
      "SELECT id FROM images WHERE id < ? ORDER BY id DESC LIMIT 1",
      [currentImageId]
    ).then((row) => (row ? row.id : null))
  }

  createImage(image: ImageData): Promise<void> {
    return this.runAsync(
      "INSERT INTO images (id, projectId, url, createdAt) VALUES (?, ?, ?, ?)",
      [image.id, image.projectId, image.url, image.createdAt]
    )
  }

  updateImage(id: string, updates: Partial<ImageData>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return this.runAsync(`UPDATE images SET ${setClause} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  deleteImage(id: string): Promise<void> {
    return this.runAsync("DELETE FROM images WHERE id = ?", [id])
  }

  getAnnotations(imageId: string): Promise<Annotation[]> {
    return this.allAsync<Annotation>(
      "SELECT * FROM annotations WHERE imageId = ?",
      [imageId]
    )
  }

  getAnnotationsWithFilter(
    imageId: string,
    filter: Partial<Annotation>
  ): Promise<Annotation[]> {
    const whereClause = Object.keys(filter)
      .map((key) => `${key} = ?`)
      .join(" AND ")
    const values = Object.values(filter)
    return this.allAsync<Annotation>(
      `SELECT * FROM annotations WHERE imageId = ? AND ${whereClause}`,
      [imageId, ...values]
    )
  }

  createAnnotation(annotation: Annotation): Promise<void> {
    return this.runAsync(
      "INSERT INTO annotations (id, imageId, createdAt, updatedAt, coordinates) VALUES (?, ?, ?, ?, ?)",
      [
        annotation.id,
        annotation.imageId,
        annotation.createdAt,
        annotation.updatedAt,
        annotation.coordinates,
      ]
    )
  }

  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return this.runAsync(`UPDATE annotations SET ${setClause} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  deleteAnnotation(id: string): Promise<void> {
    return this.runAsync("DELETE FROM annotations WHERE id = ?", [id])
  }

  createLabel(label: Label): Promise<void> {
    return this.runAsync(
      "INSERT INTO labels (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
      [label.id, label.name, label.createdAt, label.updatedAt]
    )
  }

  getLabels(): Promise<Label[]> {
    return this.allAsync<Label>("SELECT * FROM labels", [])
  }

  getLabelById(id: string): Promise<Label | undefined> {
    return this.getAsync<Label>("SELECT * FROM labels WHERE id = ?", [id])
  }

  updateLabel(id: string, updates: Partial<Label>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    return this.runAsync(`UPDATE labels SET ${setClause} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  deleteLabel(id: string): Promise<void> {
    return this.runAsync("DELETE FROM labels WHERE id = ?", [id])
  }

  getSettings(): Promise<{ key: string; value: string }[]> {
    return this.allAsync<{ key: string; value: string }>(
      "SELECT * FROM settings",
      []
    )
  }

  updateSetting(key: string, value: string): Promise<void> {
    return this.runAsync("UPDATE settings SET value = ? WHERE key = ?", [
      value,
      key,
    ])
  }

  getHistory(): Promise<History[]> {
    return this.allAsync<History>("SELECT * FROM history", [])
  }

  updateHistory(history: History): Promise<void> {
    const setClause = Object.keys(history)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(history)
    return this.runAsync(`UPDATE history SET ${setClause} WHERE id = ?`, [
      ...values,
      history.id,
    ])
  }

  async getProjects(): Promise<Project[]> {
    return this.allAsync<Project>("SELECT * FROM projects", [])
  }
}
