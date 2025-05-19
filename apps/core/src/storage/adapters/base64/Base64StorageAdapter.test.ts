import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { Base64StorageAdapter } from "./Base64StorageAdapter"

describe("Base64StorageAdapter", () => {
  let adapter: Base64StorageAdapter
  let store: Record<string, string>
  let localStorageMock: any

  beforeEach(() => {
    store = {}
    localStorageMock = {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key]
      }),
      key: jest.fn((i: number) => Object.keys(store)[i] || null),
      get length() {
        return Object.keys(store).length
      },
      clear: jest.fn(() => {
        for (const k in store) delete store[k]
      }),
    }
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      configurable: true,
    })
    adapter = new Base64StorageAdapter()
  })

  it("should be defined", () => {
    expect(Base64StorageAdapter).toBeDefined()
  })

  it("should save image to localStorage", async () => {
    // Arrange
    const id = "img1"
    const data = "base64data"
    // Act
    await adapter.saveImage(id, data)
    // Assert
    expect(localStorage.setItem).toHaveBeenCalledWith("img_" + id, data)
    expect(store["img_" + id]).toBe(data)
  })

  it("should throw error if localStorage.setItem fails", async () => {
    // Arrange
    ;(localStorage.setItem as jest.Mock).mockImplementation(() => {
      throw new Error("fail")
    })
    // Act & Assert
    await expect(adapter.saveImage("id", "data")).rejects.toThrow(
      "Failed to save image: fail"
    )
  })

  it("should load image from localStorage", async () => {
    // Arrange
    const id = "img2"
    const data = "base64img"
    store["img_" + id] = data
    // Act
    const result = await adapter.loadImage(id)
    // Assert
    expect(localStorage.getItem).toHaveBeenCalledWith("img_" + id)
    expect(result).toBe(data)
  })

  it("should throw error if image not found in loadImage", async () => {
    // Arrange
    const id = "notfound"
    // Act & Assert
    await expect(adapter.loadImage(id)).rejects.toThrow("Image not found")
  })

  it("should delete image from localStorage", async () => {
    // Arrange
    const id = "img3"
    store["img_" + id] = "data"
    // Act
    await adapter.deleteImage(id)
    // Assert
    expect(localStorage.removeItem).toHaveBeenCalledWith("img_" + id)
    expect(store["img_" + id]).toBeUndefined()
  })

  it("should list all image ids from localStorage", async () => {
    // Arrange
    // Use deterministic IDs for compatibility and test stability
    const idA = "idA"
    const idB = "idB"
    // Directly set the store to simulate localStorage content
    store["img_" + idA] = "data"
    store["img_" + idB] = "data"
    // Act
    const result = await adapter.listImages()
    // Assert
    expect(result.sort()).toEqual([idA, idB].sort())
  })
})
