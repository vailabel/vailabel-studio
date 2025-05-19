import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { S3StorageAdapter } from "./S3StorageAdapter"

jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
  }
})
jest.mock("@aws-sdk/credential-provider-cognito-identity", () => ({
  fromCognitoIdentityPool: jest.fn(() => ({})),
}))

describe("S3StorageAdapter", () => {
  let adapter: S3StorageAdapter
  let s3Instance: any
  const bucket = "test-bucket"
  const region = "us-east-1"
  const identityPoolId = "pool-id"

  beforeEach(() => {
    // Arrange
    const { S3Client } = require("@aws-sdk/client-s3")
    s3Instance = { send: jest.fn() }
    S3Client.mockImplementation(() => s3Instance)
    adapter = new S3StorageAdapter(bucket, region, identityPoolId)
  })

  it("should be defined", () => {
    expect(S3StorageAdapter).toBeDefined()
  })

  it("should call send with PutObjectCommand on saveImage", async () => {
    // Arrange
    const id = "img1"
    const data = Buffer.from("data")
    // Act
    await adapter.saveImage(id, data)
    // Assert
    const { PutObjectCommand } = require("@aws-sdk/client-s3")
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: bucket,
      Key: id,
      Body: data,
    })
    expect(s3Instance.send).toHaveBeenCalled()
  })

  it("should call send with GetObjectCommand and return buffer on loadImage", async () => {
    // Arrange
    const id = "img2"
    const chunk1 = new Uint8Array([1, 2])
    const chunk2 = new Uint8Array([3, 4])
    const mockStream = {
      getReader: () => {
        let call = 0
        return {
          read: jest.fn().mockImplementation(() => {
            call++
            if (call === 1)
              return Promise.resolve({ value: chunk1, done: false })
            if (call === 2)
              return Promise.resolve({ value: chunk2, done: false })
            return Promise.resolve({ value: undefined, done: true })
          }),
        }
      },
    }
    s3Instance.send.mockResolvedValueOnce({ Body: mockStream })
    // Act
    const result = await adapter.loadImage(id)
    // Assert
    const { GetObjectCommand } = require("@aws-sdk/client-s3")
    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: bucket, Key: id })
    expect(result).toEqual(Buffer.concat([chunk1, chunk2]))
  })

  it("should call send with DeleteObjectCommand on deleteImage", async () => {
    // Arrange
    const id = "img3"
    // Act
    await adapter.deleteImage(id)
    // Assert
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3")
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: bucket,
      Key: id,
    })
    expect(s3Instance.send).toHaveBeenCalled()
  })

  it("should call send with ListObjectsV2Command and return image keys on listImages", async () => {
    // Arrange
    const objects = [{ Key: "a.png" }, { Key: "b.png" }]
    s3Instance.send.mockResolvedValueOnce({ Contents: objects })
    // Act
    const result = await adapter.listImages()
    // Assert
    const { ListObjectsV2Command } = require("@aws-sdk/client-s3")
    expect(ListObjectsV2Command).toHaveBeenCalledWith({ Bucket: bucket })
    expect(result).toEqual(["a.png", "b.png"])
  })

  it("should return empty array if Contents is undefined in listImages", async () => {
    // Arrange
    s3Instance.send.mockResolvedValueOnce({})
    // Act
    const result = await adapter.listImages()
    // Assert
    expect(result).toEqual([])
  })
})
