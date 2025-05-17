/// <reference path='../../../type.d.ts' />
import { IDataAccess } from "@vailabel/core/src/data/interface/IDataAccess"
import {
  Project,
  ImageData,
  Annotation,
  Label,
  History,
} from "@vailabel/core/src/models/types"

export class SQLiteDataAccess implements IDataAccess {
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

  deleteProject(id: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
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
      "INSERT INTO images (id, projectId, url, createdAt) VALUES (?, ?, ?, ?)",
      [image.id, image.projectId, image.url, image.createdAt],
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
    return window.ipc.invoke("sqlite:all", [
      "SELECT * FROM annotations WHERE imageId = ?",
      [imageId],
    ])
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
      "INSERT INTO annotations (id, imageId, createdAt, updatedAt, coordinates) VALUES (?, ?, ?, ?, ?)",
      [
        annotation.id,
        annotation.imageId,
        annotation.createdAt,
        annotation.updatedAt,
        annotation.coordinates,
      ],
    ])
  }

  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
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
      "INSERT INTO labels (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
      [label.id, label.name, label.createdAt, label.updatedAt],
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

  getSettings(): Promise<{ key: string; value: string }[]> {
    return window.ipc.invoke("sqlite:all", ["SELECT * FROM settings", []])
  }

  updateSetting(key: string, value: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      "UPDATE settings SET value = ? WHERE key = ?",
      [value, key],
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
