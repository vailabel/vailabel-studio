import { IStorageAdapter } from "@vai/core/storage/interfaces/IStorageAdapter"

export class Base64StorageAdapter implements IStorageAdapter {
  private prefix = "img_"

  async saveImage(id: string, data: string): Promise<void> {
    localStorage.setItem(this.prefix + id, data)
  }

  async loadImage(id: string): Promise<string> {
    const data = localStorage.getItem(this.prefix + id)
    if (!data) throw new Error("Image not found")
    return data
  }

  async deleteImage(id: string): Promise<void> {
    localStorage.removeItem(this.prefix + id)
  }

  async listImages(): Promise<string[]> {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .map((key) => key.replace(this.prefix, ""))
  }
}
