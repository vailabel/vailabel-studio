import { IStorageAdapter } from "../../interfaces/IStorageAdapter"

export class HybridAdapter implements IStorageAdapter {
  constructor(
    private readonly local: IStorageAdapter,
    private readonly remote: IStorageAdapter
  ) {}

  async saveImage(id: string, data: Buffer): Promise<void> {
    await this.local.saveImage(id, data)
    await this.remote.saveImage(id, data)
  }

  async loadImage(id: string): Promise<Buffer> {
    try {
      const result = await this.local.loadImage(id)
      return typeof result === "string" ? Buffer.from(result) : result
    } catch (e) {
      console.info(
        `Local image not found, falling back to remote storage: ${e}`
      )
      const result = await this.remote.loadImage(id)
      return typeof result === "string" ? Buffer.from(result) : result
    }
  }

  async deleteImage(id: string): Promise<void> {
    await this.local.deleteImage(id)
    await this.remote.deleteImage(id)
  }

  async listImages(): Promise<string[]> {
    return this.local.listImages()
  }
}
