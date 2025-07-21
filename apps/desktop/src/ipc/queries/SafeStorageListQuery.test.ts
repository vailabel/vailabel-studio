import { SafeStorageListQuery } from "./SafeStorageListQuery"
import keytar from "keytar"

describe("SafeStorageListQuery", () => {
  let query: SafeStorageListQuery

  beforeEach(() => {
    query = new SafeStorageListQuery()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("should return all credentials as JSON if no prefix", async () => {
    const credentials = [
      { account: "foo", password: "bar" },
      { account: "baz", password: "qux" },
    ]
    jest.spyOn(keytar, "findCredentials").mockResolvedValue(credentials as any)
    const result = await query.handle({} as any, {})
    expect(result).toBe(JSON.stringify(credentials))
  })

  it("should filter credentials by prefix", async () => {
    const credentials = [
      { account: "foo", password: "bar" },
      { account: "baz", password: "qux" },
    ]
    jest.spyOn(keytar, "findCredentials").mockResolvedValue(credentials as any)
    const result = await query.handle({} as any, { prefix: "ba" })
    expect(result).toBe(JSON.stringify([{ account: "baz", password: "qux" }]))
  })
})
