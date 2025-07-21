import { SafeStorageGetQuery } from "./SafeStorageGetQuery"
import keytar from "keytar"

describe("SafeStorageGetQuery", () => {
  let query: SafeStorageGetQuery

  beforeEach(() => {
    query = new SafeStorageGetQuery()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("should return value from keytar", async () => {
    jest.spyOn(keytar, "getPassword").mockResolvedValue("secret-value")
    const result = await query.handle({} as any, { key: "test-key" })
    expect(keytar.getPassword).toHaveBeenCalledWith("vailabeling", "test-key")
    expect(result).toEqual({ value: "secret-value" })
  })

  it("should return null if keytar returns null", async () => {
    jest.spyOn(keytar, "getPassword").mockResolvedValue(null)
    const result = await query.handle({} as any, { key: "missing-key" })
    expect(result).toEqual({ value: null })
  })
})
