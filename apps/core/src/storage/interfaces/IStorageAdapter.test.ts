import { describe, it, expect } from "@jest/globals"
import { DexieDataAccess } from "../../data/sources/dexie/DexieDataAccess"
import { ApiDataAccess } from "../../data/sources/api/ApiDataAccess"
import { SQLiteDataAccess } from "../../data/sources/sqlite/SQLiteDataAccess"

describe("Interface and DataAccess", () => {
  it("DexieDataAccess should be defined", () => {
    expect(DexieDataAccess).toBeDefined()
  })
  it("ApiDataAccess should be defined", () => {
    expect(ApiDataAccess).toBeDefined()
  })
  it("SQLiteDataAccess should be defined", () => {
    expect(SQLiteDataAccess).toBeDefined()
  })
})
