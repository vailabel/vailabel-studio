import { IStorageAdapter } from "@vailabel/core/src/storage"

export class FileSystemStorageAdapter implements IStorageAdapter {
  constructor(private readonly directory: string) {
    if (!directory) {
      throw new Error("Directory is required")
    }
  }

  private ensureDirectory = async () => {
    await window.ipc.invoke("fs-ensure-directory", { path: this.directory })
  }

  private getPath(id: string) {
    return `${this.directory}/${id}`
  }

  saveImage = async (id: string, data: Buffer): Promise<void> => {
    await this.ensureDirectory()
    await window.ipc.invoke("fs-save-image", { path: this.getPath(id), data })
  }

  loadImage = async (id: string): Promise<Buffer> => {
    await this.ensureDirectory()
    return (await window.ipc.invoke("fs-load-image", {
      path: this.getPath(id),
    })) as Buffer
  }

  deleteImage = async (id: string): Promise<void> => {
    await this.ensureDirectory()
    await window.ipc.invoke("fs-delete-image", { path: this.getPath(id) })
  }

  listImages = async (): Promise<string[]> => {
    await this.ensureDirectory()
    const files = (await window.ipc.invoke("fs-list-images", {
      directory: this.directory,
    })) as string[]
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
      imageFiles.map(
        (f: string) =>
          window.ipc.invoke("fs-get-base-name", {
            file: f,
          }) as Promise<string>
      )
    )
    return baseNames
  }
}
