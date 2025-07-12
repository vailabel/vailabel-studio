import { ImageData, Annotation } from "../../../models"
import { DataAccess } from "../../contracts/DataAccess"
import { IImageDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class ImageDataAccess
  extends SQLiteDataAccess<ImageData>
  implements IImageDataAccess
{
  constructor() {
    super(ImageData)
  }

  async getImageWithAnnotations(imageId: string): Promise<ImageData | null> {
    // Use Sequelize to include annotations
    const image = (await window.ipc.invoke(
      "sqlite:getById",
      ImageData.name,
      imageId
    )) as Promise<ImageData | null>
    return image
  }

  async getNext(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasNext: boolean }> {
    // Find the next image by id in the same project
    const next = (await window.ipc.invoke(
      "sqlite:getNext",
      ImageData.name,
      projectId,
      currentImageId
    )) as Promise<{ id: string | undefined; hasNext: boolean }>
    return next
  }

  async getPrevious(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasPrevious: boolean }> {
    // Find the previous image by id in the same project
    const prev = (await window.ipc.invoke(
      "sqlite:getPrevious",
      ImageData.name,
      projectId,
      currentImageId
    )) as Promise<{ id: string | undefined; hasPrevious: boolean }>
    return prev
  }

  async getByProjectId(projectId: string): Promise<ImageData[]> {
    return (await window.ipc.invoke(
      "sqlite:getByProjectId",
      ImageData.name,
      projectId
    )) as Promise<ImageData[]>
  }

  async countByProjectId(projectId: string): Promise<number> {
    return (await window.ipc.invoke("sqlite:count", ImageData.name, {
      projectId,
    })) as Promise<number>
  }
}
