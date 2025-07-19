import { AzureBlobStorageAdapter } from "./AzureBlobStorageAdapter"

const createMockBlob = () => ({
  uploadData: jest.fn(),
  download: jest.fn(),
})

describe("AzureBlobStorageAdapter", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let containerClient: any
  let adapter: AzureBlobStorageAdapter

  beforeEach(() => {
    containerClient = {
      getBlockBlobClient: jest.fn(),
      deleteBlob: jest.fn(),
      listBlobsFlat: jest.fn(),
    }
    adapter = new AzureBlobStorageAdapter(containerClient)
  })

  it("should be defined", () => {
    expect(AzureBlobStorageAdapter).toBeDefined()
  })

  it("should save image using uploadData", async () => {
    // Arrange
    const id = "img1"
    const data = Buffer.from("data")
    const mockBlob = createMockBlob()
    containerClient.getBlockBlobClient.mockReturnValue(mockBlob)
    // Act
    await adapter.saveImage(id, data)
    // Assert
    expect(containerClient.getBlockBlobClient).toHaveBeenCalledWith(id)
    expect(mockBlob.uploadData).toHaveBeenCalledWith(data)
  })

  it("should load image and return buffer", async () => {
    // Arrange
    const id = "img2"
    const chunk1 = Buffer.from([1, 2])
    const chunk2 = Buffer.from([3, 4])
    const mockBlob = createMockBlob()
    // Use 'as any' to avoid type error for mock resolved value
    ;(mockBlob as any).download.mockResolvedValue({
      readableStreamBody: {
        async *[Symbol.asyncIterator]() {
          yield chunk1
          yield chunk2
        },
      },
    })
    containerClient.getBlockBlobClient.mockReturnValue(mockBlob)
    // Act
    const result = await adapter.loadImage(id)
    // Assert
    expect(containerClient.getBlockBlobClient).toHaveBeenCalledWith(id)
    expect(mockBlob.download).toHaveBeenCalled()
    expect(result).toEqual(Buffer.concat([chunk1, chunk2]))
  })

  it("should delete image using deleteBlob", async () => {
    // Arrange
    const id = "img3"
    // Act
    await adapter.deleteImage(id)
    // Assert
    expect(containerClient.deleteBlob).toHaveBeenCalledWith(id)
  })

  it("should list all blob names", async () => {
    // Arrange
    const blobs = [{ name: "a.png" }, { name: "b.png" }]
    containerClient.listBlobsFlat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        for (const blob of blobs) yield blob
      },
    })
    // Act
    const result = await adapter.listImages()
    // Assert
    expect(result).toEqual(["a.png", "b.png"])
  })
})
