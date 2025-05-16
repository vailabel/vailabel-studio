import { IStorageAdapter } from "@/storeage/interfaces/IStorageAdapter"
import * as fs from "fs/promises"
import * as path from "path"

export class FileSystemStorageAdapter implements IStorageAdapter {
  constructor(private directory: string) {}

  private getPath(id: string) {
    return path.join(this.directory, id + ".png")
  }

  async saveImage(id: string, data: Buffer): Promise<void> {
    await fs.writeFile(this.getPath(id), data)
  }

  async loadImage(id: string): Promise<Buffer> {
    return fs.readFile(this.getPath(id))
  }

  async deleteImage(id: string): Promise<void> {
    await fs.unlink(this.getPath(id))
  }

  async listImages(): Promise<string[]> {
    const files = await fs.readdir(this.directory)
    return files
      .filter((f) => f.endsWith(".png"))
      .map((f) => path.basename(f, ".png"))
  }
}
