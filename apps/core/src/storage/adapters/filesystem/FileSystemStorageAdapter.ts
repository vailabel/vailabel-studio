import { IStorageAdapter } from "@vailabel/core/src/storage"

export class FileSystemStorageAdapter implements IStorageAdapter {
  constructor(private directory: string) {
    if (!directory) {
      throw new Error("Directory is required")
    }
    this.directory = directory
    // Ensure the directory exists
    window.ipc.invoke("fs-ensure-directory", { path: this.directory })
  }

  private getPath(id: string) {
    return `${this.directory}/${id}`
  }

  saveImage = async (id: string, data: Buffer): Promise<void> => {
    await window.ipc.invoke("fs-save-image", { path: this.getPath(id), data })
  }

  loadImage = async (id: string): Promise<Buffer> => {
    return (await window.ipc.invoke("fs-load-image", {
      path: this.getPath(id),
    })) as Buffer
  }

  deleteImage = async (id: string): Promise<void> => {
    await window.ipc.invoke("fs-delete-image", { path: this.getPath(id) })
  }

  listImages = async (): Promise<string[]> => {
    const files = (await window.ipc.invoke("fs-list-images", {
      directory: this.directory,
    })) as string[]
    const baseNames = await Promise.all(
      files
        .filter((f: string) => f.endsWith(".png"))
        .map(
          (f: string) =>
            window.ipc.invoke("fs-get-base-name", {
              file: f,
            }) as Promise<string>
        )
    )
    return baseNames
  }
}
