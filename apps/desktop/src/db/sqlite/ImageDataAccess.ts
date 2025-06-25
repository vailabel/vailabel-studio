import { ImageData, Annotation } from "@vailabel/core"
import { DataAccess } from "@vailabel/core/data"
import { IImageDataAccess } from "@vailabel/core/data"

export class ImageDataAccess
  extends DataAccess<ImageData>
  implements IImageDataAccess
{
  constructor() {
    super(ImageData)
  }

  async getImageWithAnnotations(imageId: string): Promise<ImageData | null> {
    // Use Sequelize to include annotations
    const image = await ImageData.findByPk(imageId, {
      include: [Annotation],
    })
    return image as ImageData | null
  }

  async getNext(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasNext: boolean }> {
    // Find the next image by id in the same project
    const next = await ImageData.findOne({
      where: { projectId, id: { $gt: currentImageId } },
      order: [["id", "ASC"]],
    })
    const hasNext = !!next
    return { id: next?.id, hasNext }
  }

  async getPrevious(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasPrevious: boolean }> {
    // Find the previous image by id in the same project
    const prev = await ImageData.findOne({
      where: { projectId, id: { $lt: currentImageId } },
      order: [["id", "DESC"]],
    })
    const hasPrevious = !!prev
    return { id: prev?.id, hasPrevious }
  }

  async getByProjectId(projectId: string): Promise<ImageData[]> {
    return ImageData.findAll({ where: { projectId } })
  }

  async countByProjectId(projectId: string): Promise<number> {
    return ImageData.count({ where: { projectId } })
  }
}
