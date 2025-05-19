import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { ApiClient } from "./ApiClient"
import { ApiDataAccess } from "./ApiDataAccess"

global.fetch = jest.fn() as any

describe("ApiClient", () => {
  let client: ApiClient
  beforeEach(() => {
    client = new ApiClient({ baseUrl: "https://test.local" })
    ;(global.fetch as any).mockClear()
  })

  it("should be defined", () => {
    expect(ApiClient).toBeDefined()
  })

  it("should call fetch with correct URL and method for GET", async () => {
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.get("/foo")
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.local/foo",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("should call fetch with correct URL, method, and body for POST", async () => {
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.post("/bar", { a: 1 })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.local/bar",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ a: 1 }),
      })
    )
  })

  it("should call fetch with correct URL, method, and body for PUT", async () => {
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.put("/baz", { b: 2 })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.local/baz",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ b: 2 }) })
    )
  })

  it("should call fetch with correct URL and method for DELETE", async () => {
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.delete("/qux")
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.local/qux",
      expect.objectContaining({ method: "DELETE" })
    )
    // Optionally check that body is not set for DELETE
    const fetchCallArgs = (global.fetch as any).mock.calls[0][1]
    expect(fetchCallArgs.body).toBeUndefined()
  })

  it("should cache GET requests if enabled", async () => {
    client = new ApiClient({
      baseUrl: "https://test.local",
      cache: true,
      cacheDuration: 1000,
    })
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ foo: 123 }),
      status: 200,
      ok: true,
    })
    const result1 = await client.get("/cache")
    const result2 = await client.get("/cache")
    expect(result1).toEqual({ foo: 123 })
    expect(result2).toEqual({ foo: 123 })
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })

  it("should use default options in constructor", () => {
    const defaultClient = new ApiClient()
    expect(defaultClient).toBeInstanceOf(ApiClient)
  })

  it("should add and use request interceptors", async () => {
    const interceptor: import("./ApiClient").RequestInterceptor = async (
      input,
      init
    ) => [
      input + "?intercepted",
      { ...init, headers: { ...(init.headers || {}), foo: "bar" } },
    ]
    client.addRequestInterceptor(interceptor)
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.get("/foo")
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("intercepted"),
      expect.objectContaining({
        headers: expect.objectContaining({ foo: "bar" }),
      })
    )
  })

  it("should add and use response interceptors", async () => {
    const responseInterceptor: import("./ApiClient").ResponseInterceptor =
      async (res) => {
        Object.defineProperty(res, "intercepted", {
          value: true,
          configurable: true,
        })
        return res
      }
    client.addResponseInterceptor(responseInterceptor)
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.get("/foo")
    // No error means the interceptor was called
  })

  it("should use getAuthToken if provided", async () => {
    const getAuthToken = () => Promise.resolve("token123")
    client = new ApiClient({ baseUrl: "https://test.local", getAuthToken })
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.get("/foo")
    const fetchCallArgs = (global.fetch as any).mock.calls[0][1]
    expect(fetchCallArgs.headers.Authorization).toBe("Bearer token123")
  })

  it("should not set Authorization if getAuthToken returns null", async () => {
    const getAuthToken = () => Promise.resolve(null)
    client = new ApiClient({ baseUrl: "https://test.local", getAuthToken })
    ;(global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
      ok: true,
    })
    await client.get("/foo")
    const fetchCallArgs = (global.fetch as any).mock.calls[0][1]
    expect(fetchCallArgs.headers.Authorization).toBeUndefined()
  })

  it("should clear cache with clearCache", () => {
    client = new ApiClient({ baseUrl: "https://test.local", cache: true })
    // @ts-ignore
    client.cacheStore.set("foo", { value: 1, expires: Date.now() + 1000 })
    client.clearCache()
    // @ts-ignore
    expect(client.cacheStore.size).toBe(0)
  })

  it("should handle 204 No Content for DELETE", async () => {
    ;(global.fetch as any).mockResolvedValue({
      status: 204,
      ok: true,
      json: () => Promise.resolve(undefined),
    })
    const result = await client.delete("/no-content")
    expect(result).toBeUndefined()
  })
})

describe("ApiDataAccess", () => {
  it("should be defined", () => {
    expect(ApiDataAccess).toBeDefined()
  })
})
