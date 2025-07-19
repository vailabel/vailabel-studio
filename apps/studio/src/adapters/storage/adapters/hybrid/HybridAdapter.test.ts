import { HybridAdapter } from "./HybridAdapter"

const createMockAdapter = () => ({
  saveImage: jest.fn(),
  loadImage: jest.fn(),
  deleteImage: jest.fn(),
  listImages: jest.fn(),
})

describe("HybridAdapter", () => {
  let local: any
  let remote: any
  let adapter: HybridAdapter

  beforeEach(() => {
    local = createMockAdapter()
    remote = createMockAdapter()
    adapter = new HybridAdapter(local, remote)
  })

  it("should be defined", () => {
    expect(HybridAdapter).toBeDefined()
  })

  it("should call saveImage on both local and remote", async () => {
    // Arrange
    const id = "img1"
    const data = Buffer.from("data")
    // Act
    await adapter.saveImage(id, data)
    // Assert
    expect(local.saveImage).toHaveBeenCalledWith(id, data)
    expect(remote.saveImage).toHaveBeenCalledWith(id, data)
  })

  it("should load image from local if available", async () => {
    // Arrange
    const id = "img2"
    const buffer = Buffer.from("abc")
    local.loadImage.mockResolvedValue(buffer)
    // Act
    const result = await adapter.loadImage(id)
    // Assert
    expect(local.loadImage).toHaveBeenCalledWith(id)
    expect(result).toBe(buffer)
    expect(remote.loadImage).not.toHaveBeenCalled()
  })

  it("should load image from remote if local fails", async () => {
    // Arrange
    const id = "img3"
    local.loadImage.mockRejectedValue(new Error("fail"))
    const remoteBuffer = Buffer.from("remote")
    remote.loadImage.mockResolvedValue(remoteBuffer)
    // Act
    const result = await adapter.loadImage(id)
    // Assert
    expect(local.loadImage).toHaveBeenCalledWith(id)
    expect(remote.loadImage).toHaveBeenCalledWith(id)
    expect(result).toBe(remoteBuffer)
  })

  it("should convert string result to Buffer in loadImage", async () => {
    // Arrange
    const id = "img4"
    local.loadImage.mockResolvedValue("stringdata")
    // Act
    const result = await adapter.loadImage(id)
    // Assert
    expect(result).toEqual(Buffer.from("stringdata"))
  })

  it("should call deleteImage on both local and remote", async () => {
    // Arrange
    const id = "img5"
    // Act
    await adapter.deleteImage(id)
    // Assert
    expect(local.deleteImage).toHaveBeenCalledWith(id)
    expect(remote.deleteImage).toHaveBeenCalledWith(id)
  })

  it("should list images from local", async () => {
    // Arrange
    const images = ["a", "b"]
    local.listImages.mockResolvedValue(images)
    // Act
    const result = await adapter.listImages()
    // Assert
    expect(local.listImages).toHaveBeenCalled()
    expect(result).toBe(images)
  })
})
