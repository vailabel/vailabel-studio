import { ImageData } from "@vailabel/core"

export interface IImageDataService {
  getImagesByProjectId(projectId: string): Promise<ImageData[]>
  getImageById(imageId: string): Promise<ImageData | undefined>
  createImage(imageData: ImageData): Promise<void>
  updateImage(imageId: string, updates: Partial<ImageData>): Promise<void>
  deleteImage(imageId: string): Promise<void>
  getImagesRange(projectId: string, offset: number, limit: number): Promise<ImageData[]>
}
