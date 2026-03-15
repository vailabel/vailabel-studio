import { ImageData } from "@vailabel/core"
import { studioCommands } from "@/ipc/studio"

export const imagesService = {
  getImagesByProjectId: (projectId: string) =>
    studioCommands.imagesListByProject(projectId),
  getImage: (imageId: string) => studioCommands.imagesGet(imageId),
  getImageRange: (projectId: string, offset: number, limit: number) =>
    studioCommands.imagesListRange({ projectId, offset, limit }),
  createImage: (image: Partial<ImageData>) => studioCommands.imagesSave(image),
  updateImage: (imageId: string, updates: Partial<ImageData>) =>
    studioCommands.imagesSave({ id: imageId, ...updates }),
  deleteImage: (imageId: string) => studioCommands.imagesDelete(imageId),
}
