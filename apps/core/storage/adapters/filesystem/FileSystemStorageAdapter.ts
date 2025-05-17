import { IStorageAdapter } from "@vai/core/storage/interfaces/IStorageAdapter"
import * as path from "path"
// Extend the Window interface to include 'ipc'
declare global {
  interface Window {
    ipc: {
      invoke(channel: string, args?: any): Promise<any>
    }
  }
}

export class FileSystemStorageAdapter implements IStorageAdapter {
  constructor(private directory: string) {}

  private getPath(id: string) {
    return path.join(this.directory, id + ".png")
  }

  async saveImage(id: string, data: Buffer): Promise<void> {
    await window.ipc.invoke("fs-save-image", { path: this.getPath(id), data })
  }

  async loadImage(id: string): Promise<Buffer> {
    return window.ipc.invoke("fs-load-image", { path: this.getPath(id) })
  }

  async deleteImage(id: string): Promise<void> {
    await window.ipc.invoke("fs-delete-image", { path: this.getPath(id) })
  }

  async listImages(): Promise<string[]> {
    const files = await window.ipc.invoke("fs-list-images", {
      directory: this.directory,
    })
    return files
      .filter((f: string) => f.endsWith(".png"))
      .map((f: string) => path.basename(f, ".png"))
  }
}
