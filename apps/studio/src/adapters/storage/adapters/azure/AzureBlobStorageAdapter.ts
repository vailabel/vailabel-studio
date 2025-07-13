import { ContainerClient } from "@azure/storage-blob"
import { IStorageAdapter } from "@vailabel/core/src/storage"

export class AzureBlobStorageAdapter implements IStorageAdapter {
  constructor(private readonly containerClient: ContainerClient) {}

  async saveImage(id: string, data: Buffer): Promise<void> {
    const blob = this.containerClient.getBlockBlobClient(id)
    await blob.uploadData(data)
  }

  async loadImage(id: string): Promise<Buffer> {
    const blob = this.containerClient.getBlockBlobClient(id)
    const response = await blob.download()
    const stream = response.readableStreamBody!
    const chunks: Buffer[] = []
    for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  async deleteImage(id: string): Promise<void> {
    await this.containerClient.deleteBlob(id)
  }

  async listImages(): Promise<string[]> {
    const names: string[] = []
    for await (const blob of this.containerClient.listBlobsFlat()) {
      names.push(blob.name)
    }
    return names
  }
}
