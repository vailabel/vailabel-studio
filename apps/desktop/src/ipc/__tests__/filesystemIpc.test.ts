import { jest } from "@jest/globals"

// Arrange: Mocks for Electron and Node modules
jest.mock("electron", () => ({
  ipcMain: {
    handle: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => "/mock/userData"),
  },
}))
jest.mock("fs/promises", () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn(),
}))
jest.mock("path", () => ({
  join: jest.fn((...args: string[]) => args.join("/")),
  isAbsolute: jest.fn((p: string) => p.startsWith("/")),
  basename: jest.fn((f: string) => f.split("/").pop()),
}))

// Import after mocks
import * as fs from "fs/promises"
import * as path from "path"
import { ipcMain, app } from "electron"

// Act: Import the file to register handlers
describe("filesystemIpc", () => {
  const handlers: Record<string, Function> = {}
  beforeAll(() => {
    // Capture handler registrations
    ;(ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
      const [name, fn] = args as [string, Function]
      handlers[name] = fn
    })
    // Register handlers after mockImplementation is set
    require("../filesystemIpc")
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // fs-save-image
  it("saves image from base64 string", async () => {
    const data = Buffer.from("abc").toString("base64")
    await handlers["fs-save-image"]({}, { path: "img.png", data })
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves image from data URL", async () => {
    const data =
      "data:image/png;base64," + Buffer.from("abc").toString("base64")
    await handlers["fs-save-image"]({}, { path: "img.png", data })
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves image from Buffer", async () => {
    await handlers["fs-save-image"](
      {},
      { path: "img.png", data: Buffer.from("abc") }
    )
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves image from ArrayBuffer", async () => {
    const ab = new Uint8Array([1, 2, 3]).buffer
    await handlers["fs-save-image"]({}, { path: "img.png", data: ab })
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves image from Uint8Array", async () => {
    await handlers["fs-save-image"](
      {},
      { path: "img.png", data: new Uint8Array([1, 2, 3]) }
    )
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves image from Array", async () => {
    await handlers["fs-save-image"]({}, { path: "img.png", data: [1, 2, 3] })
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("throws on unsupported image data", async () => {
    await expect(
      handlers["fs-save-image"]({}, { path: "img.png", data: 123 })
    ).rejects.toThrow("Unsupported data type for image saving")
  })

  // fs-load-image
  it("loads image", async () => {
    ;(fs.readFile as any).mockResolvedValueOnce("filedata")
    const result = await handlers["fs-load-image"]({}, { path: "img.png" })
    expect(fs.readFile).toHaveBeenCalled()
    expect(result).toBe("filedata")
  })

  // fs-delete-image
  it("deletes image", async () => {
    await handlers["fs-delete-image"]({}, { path: "img.png" })
    expect(fs.unlink).toHaveBeenCalled()
  })

  // fs-list-images
  it("lists images", async () => {
    ;(fs.readdir as any).mockResolvedValueOnce(["a.png", "b.png"])
    const result = await handlers["fs-list-images"]({}, { directory: "dir" })
    expect(fs.readdir).toHaveBeenCalled()
    expect(result).toEqual(["a.png", "b.png"])
  })

  // fs-get-path
  it("gets full path for image id", async () => {
    ;(path.join as jest.Mock).mockReturnValue("/mock/userData/dir/img.png")
    const result = await handlers["fs-get-path"](
      {},
      { directory: "dir", id: "img.png" }
    )
    expect(path.join).toHaveBeenCalled()
    expect(result).toBe("/mock/userData/dir/img.png")
  })

  // fs-get-base-name
  it("gets base name of file", async () => {
    ;(path.basename as jest.Mock).mockReturnValue("img.png")
    const result = await handlers["fs-get-base-name"](
      {},
      { file: "/mock/userData/dir/img.png" }
    )
    expect(path.basename).toHaveBeenCalled()
    expect(result).toBe("img.png")
  })

  // fs-ensure-directory
  it("ensures directory exists", async () => {
    await handlers["fs-ensure-directory"]({}, { path: "dir" })
    expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    })
  })

  // fs-save-blob
  it("saves blob from Buffer", async () => {
    await handlers["fs-save-blob"](
      {},
      { path: "file.bin", blob: Buffer.from("abc") }
    )
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves blob from ArrayBuffer", async () => {
    const ab = new Uint8Array([1, 2, 3]).buffer
    await handlers["fs-save-blob"]({}, { path: "file.bin", blob: ab })
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves blob from Uint8Array", async () => {
    await handlers["fs-save-blob"](
      {},
      { path: "file.bin", blob: new Uint8Array([1, 2, 3]) }
    )
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("saves blob from Array", async () => {
    await handlers["fs-save-blob"]({}, { path: "file.bin", blob: [1, 2, 3] })
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("throws on unsupported blob type", async () => {
    await expect(
      handlers["fs-save-blob"]({}, { path: "file.bin", blob: 123 })
    ).rejects.toThrow("Unsupported blob type")
  })
})
