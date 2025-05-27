import { ImageData } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { IImageDataAccess } from "../../contracts/IDataAccess"

export class ImageDataAccess
  extends DataAccess<ImageData>
  implements IImageDataAccess
{
  constructor() {
    super("images")
  }
  async getImageWithAnnotations(imageId: string): Promise<ImageData | null> {
    // Fetch the image data
    const image = await window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE id = ?`,
      [imageId],
    ])
    if (!image) return null
    // Fetch all annotations for this image
    const annotations = await window.ipc.invoke("sqlite:all", [
      `SELECT * FROM annotations WHERE imageId = ?`,
      [imageId],
    ])
    return {
      ...image,
      annotations: Array.isArray(annotations)
        ? annotations.map((a: any) => ({
            ...a,
            coordinates: a.coordinates ? JSON.parse(a.coordinates) : undefined,
          }))
        : [],
    } as ImageData
  }
  async getNext(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasNext: boolean }> {
    const result = await window.ipc.invoke("sqlite:get", [
      `SELECT id FROM ${this.table} WHERE projectId = ? AND id > ? ORDER BY id ASC LIMIT 1`,
      [projectId, currentImageId],
    ])
    const hasNextResult = await window.ipc.invoke("sqlite:get", [
      `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ? AND id > ?`,
      [projectId, result?.id ?? currentImageId],
    ])
    return {
      id: result?.id,
      hasNext: hasNextResult.count > 0,
    }
  }

  async getPrevious(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasPrevious: boolean }> {
    const result = await window.ipc.invoke("sqlite:get", [
      `SELECT id FROM ${this.table} WHERE projectId = ? AND id < ? ORDER BY id DESC LIMIT 1`,
      [projectId, currentImageId],
    ])
    const hasPrevResult = await window.ipc.invoke("sqlite:get", [
      `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ? AND id < ?`,
      [projectId, result?.id ?? currentImageId],
    ])
    return {
      id: result?.id,
      hasPrevious: hasPrevResult.count > 0,
    }
  }
  getByProjectId(projectId: string): Promise<ImageData[]> {
    const result = window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE projectId = ?`,
      [projectId],
    ])
    return result.then((data) =>
      data.map((item: any) => ({ ...item, data: item.data }))
    )
  }
  countByProjectId(projectId: string): Promise<number> {
    const result = window.ipc.invoke("sqlite:get", [
      `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ?`,
      [projectId],
    ])
    return result.then((data) => data.count)
  }
}
