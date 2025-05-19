import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { FileSystemStorageAdapter } from "./FileSystemStorageAdapter"

// Add a global type declaration for window.ipc
export {} // Ensure this file is a module

declare global {
  interface Window {
    ipc: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

// Arrange: mock window.ipc.invoke
globalThis.window = Object.create(window)
;(window as any).ipc = {
  invoke: jest.fn(),
} as Window["ipc"]

describe("FileSystemStorageAdapter", () => {
  const directory = "/mock/dir"
  let adapter: FileSystemStorageAdapter

  beforeEach(() => {
    ;(window.ipc.invoke as jest.Mock).mockClear()
    // Default mock implementation for all calls
    ;(window.ipc.invoke as jest.Mock).mockImplementation((...args: any[]) => {
      const channel = args[0]
      if (channel === "fs-load-image")
        return Promise.resolve(Buffer.from("mock"))
      if (channel === "fs-list-images")
        return Promise.resolve(["a.png", "b.png"])
      if (channel === "fs-get-base-name") return Promise.resolve("a")
      return Promise.resolve()
    })
    adapter = new FileSystemStorageAdapter(directory)
  })

  it("should be defined", () => {
    expect(FileSystemStorageAdapter).toBeDefined()
  })

  it("should throw if directory is not provided", () => {
    expect(() => new FileSystemStorageAdapter("")).toThrow(
      "Directory is required"
    )
  })

  it("should ensure directory exists on construction", () => {
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-ensure-directory", {
      path: directory,
    })
  })

  it("should save image via IPC", async () => {
    await adapter.saveImage("img1", Buffer.from("data"))
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-save-image", {
      path: `${directory}/img1`,
      data: Buffer.from("data"),
    })
  })

  it("should load image via IPC", async () => {
    const mockBuffer = Buffer.from("imgdata")
    ;(window.ipc.invoke as any).mockResolvedValueOnce(mockBuffer)
    const result = await adapter.loadImage("img2")
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-load-image", {
      path: `${directory}/img2`,
    })
    expect(result).toBe(mockBuffer)
  })

  it("should delete image via IPC", async () => {
    await adapter.deleteImage("img3")
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-delete-image", {
      path: `${directory}/img3`,
    })
  })

  it("should list images and return base names", async () => {
    ;(window.ipc.invoke as any)
      .mockResolvedValueOnce(["a.png", "b.txt", "c.png"]) // fs-list-images
      .mockResolvedValueOnce("a") // fs-get-base-name for a.png
      .mockResolvedValueOnce("c") // fs-get-base-name for c.png
    const result = await adapter.listImages()
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-list-images", {
      directory,
    })
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-get-base-name", {
      file: "a.png",
    })
    expect(window.ipc.invoke).toHaveBeenCalledWith("fs-get-base-name", {
      file: "c.png",
    })
    expect(result).toEqual(["a", "c"])
  })
})
