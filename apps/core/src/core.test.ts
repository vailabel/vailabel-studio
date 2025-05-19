import { describe, it, expect } from "@jest/globals"
import { DexieDataAccess } from "./data/sources/dexie/DexieDataAccess"
import { ApiClient } from "./data/sources/api/ApiClient"
import { ApiDataAccess } from "./data/sources/api/ApiDataAccess"
import { SQLiteDataAccess } from "./data/sources/sqlite/SQLiteDataAccess"
import { FileSystemStorageAdapter } from "./storage/adapters/filesystem/FileSystemStorageAdapter"
import { Base64StorageAdapter } from "./storage/adapters/base64/Base64StorageAdapter"
import { S3StorageAdapter } from "./storage/adapters/s3/S3StorageAdapter"
import { AzureBlobStorageAdapter } from "./storage/adapters/azure/AzureBlobStorageAdapter"
import { HybridAdapter } from "./storage/adapters/hybrid/HybridAdapter"

describe("Core adapters and data access", () => {
  it("DexieDataAccess should be defined", () => {
    expect(DexieDataAccess).toBeDefined()
  })
  it("ApiClient should be defined", () => {
    expect(ApiClient).toBeDefined()
  })
  it("ApiDataAccess should be defined", () => {
    expect(ApiDataAccess).toBeDefined()
  })
  it("SQLiteDataAccess should be defined", () => {
    expect(SQLiteDataAccess).toBeDefined()
  })
  it("FileSystemStorageAdapter should be defined", () => {
    expect(FileSystemStorageAdapter).toBeDefined()
  })
  it("Base64StorageAdapter should be defined", () => {
    expect(Base64StorageAdapter).toBeDefined()
  })
  it("S3StorageAdapter should be defined", () => {
    expect(S3StorageAdapter).toBeDefined()
  })
  it("AzureBlobStorageAdapter should be defined", () => {
    expect(AzureBlobStorageAdapter).toBeDefined()
  })
  it("HybridAdapter should be defined", () => {
    expect(HybridAdapter).toBeDefined()
  })
})
