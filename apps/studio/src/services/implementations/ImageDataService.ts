import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { IImageDataService } from "../contracts/IImageDataService"
import { ImageData } from "@vailabel/core"

export class ImageDataService implements IImageDataService {
  private dataAdapter: IDataAdapter

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getImagesByProjectId(projectId: string): Promise<ImageData[]> {
    return await this.dataAdapter.fetchImageDataByProjectId(projectId)
  }

  async getImageById(imageId: string): Promise<ImageData | undefined> {
    return await this.dataAdapter.fetchImageDataById(imageId)
  }

  async createImage(imageData: ImageData): Promise<void> {
    await this.dataAdapter.saveImageData(imageData)
  }

  async updateImage(imageId: string, updates: Partial<ImageData>): Promise<void> {
    await this.dataAdapter.updateImageData(imageId, updates)
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.dataAdapter.deleteImageData(imageId)
  }

  async getImagesRange(projectId: string, offset: number, limit: number): Promise<ImageData[]> {
    return await this.dataAdapter.fetchImageDataRange(projectId, offset, limit)
  }
}
