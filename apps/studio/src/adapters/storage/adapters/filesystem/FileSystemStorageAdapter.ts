import { IStorageAdapter } from "../../interfaces/IStorageAdapter"
import {
  deleteImageFile,
  ensureDirectory,
  getBaseName,
  listImageFiles,
  loadImageFile,
  saveImageFile,
} from "@/lib/desktop"

export class FileSystemStorageAdapter implements IStorageAdapter {
  constructor(private readonly directory: string) {
    if (!directory) {
      throw new Error(
        "Directory path must be provided for FileSystemStorageAdapter"
      )
    }
    this.ensureDirectory()
  }
  private ensureDirectory = async () => {
    await ensureDirectory(this.directory)
  }

  private getPath(id: string) {
    return `${this.directory}/${id}`
  }

  saveImage = async (id: string, data: Buffer): Promise<void> => {
    await this.ensureDirectory()
    await saveImageFile(this.getPath(id), Buffer.from(data).toString("base64"))
  }

  loadImage = async (id: string): Promise<Buffer> => {
    await this.ensureDirectory()
    const encoded = await loadImageFile(this.getPath(id))
    return Buffer.from(encoded, "base64")
  }

  deleteImage = async (id: string): Promise<void> => {
    await this.ensureDirectory()
    await deleteImageFile(this.getPath(id))
  }

  listImages = async (): Promise<string[]> => {
    await this.ensureDirectory()
    const files = await listImageFiles(this.directory)
    // Only return image files (png, jpg, jpeg, gif, bmp, webp, tiff, svg)
    const imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".webp",
      ".tiff",
      ".svg",
    ]
    const imageFiles = files.filter((f: string) =>
      imageExtensions.some((ext) => f.toLowerCase().endsWith(ext))
    )
    const baseNames = await Promise.all(
      imageFiles.map((file: string) => getBaseName(file))
    )
    return baseNames
  }
}
