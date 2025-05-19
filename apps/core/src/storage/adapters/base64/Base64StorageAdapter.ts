import { IStorageAdapter } from "@vailabel/core/src/storage"

export class Base64StorageAdapter implements IStorageAdapter {
  private static prefix = "img_"

  async saveImage(id: string, data: string): Promise<void> {
    try {
      localStorage.setItem(Base64StorageAdapter.prefix + id, data)
    } catch (e: any) {
      throw new Error("Failed to save image: " + e.message)
    }
  }

  async loadImage(id: string): Promise<string> {
    const data = localStorage.getItem(Base64StorageAdapter.prefix + id)
    if (!data) throw new Error("Image not found")
    return data
  }

  async deleteImage(id: string): Promise<void> {
    localStorage.removeItem(Base64StorageAdapter.prefix + id)
  }

  async listImages(): Promise<string[]> {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(Base64StorageAdapter.prefix)) {
        keys.push(key.replace(Base64StorageAdapter.prefix, ""))
      }
    }
    return keys
  }
}
