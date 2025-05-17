export type RequestInterceptor = (
  input: RequestInfo,
  init: RequestInit
) => Promise<[RequestInfo, RequestInit]> | [RequestInfo, RequestInit]
export type ResponseInterceptor = (
  response: Response
) => Promise<Response> | Response

export type ApiClientOptions = {
  baseUrl?: string
  headers?: Record<string, string>
  getAuthToken?: () => Promise<string | null> | string | null
  cache?: boolean
  cacheDuration?: number // in milliseconds
}

export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private getAuthToken?: () => Promise<string | null> | string | null
  private cacheEnabled: boolean
  private cacheStore: Map<string, { value: unknown; expires: number }>
  private cacheDuration: number // in milliseconds

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || "/api"
    this.headers = options.headers || { "Content-Type": "application/json" }
    this.getAuthToken = options.getAuthToken
    this.cacheEnabled = options.cache ?? false
    this.cacheDuration = options.cacheDuration ?? 5 * 60 * 1000 // default 5 minutes
    this.cacheStore = new Map()
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  private async applyRequestInterceptors(
    input: RequestInfo,
    init: RequestInit
  ): Promise<[RequestInfo, RequestInit]> {
    let req: [RequestInfo, RequestInit] = [input, init]
    for (const interceptor of this.requestInterceptors) {
      req = await interceptor(req[0], req[1])
    }
    return req
  }

  private async applyResponseInterceptors(
    response: Response
  ): Promise<Response> {
    let res = response
    for (const interceptor of this.responseInterceptors) {
      res = await interceptor(res)
    }
    return res
  }

  private async withAuth(init: RequestInit = {}): Promise<RequestInit> {
    if (!this.getAuthToken) return init
    const token = await this.getAuthToken()
    if (token) {
      return {
        ...init,
        headers: {
          ...this.headers,
          ...(init.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      }
    }
    return {
      ...init,
      headers: { ...this.headers, ...(init.headers || {}) },
    }
  }

  private cacheKey(method: string, path: string, body?: unknown) {
    return `${method}:${this.baseUrl}${path}:${body ? JSON.stringify(body) : ""}`
  }

  async get<T = unknown>(path: string): Promise<T> {
    const key = this.cacheKey("GET", path)
    const now = Date.now()
    if (this.cacheEnabled && this.cacheStore.has(key)) {
      const cached = this.cacheStore.get(key)
      if (cached && now < cached.expires) {
        return cached.value as T
      } else {
        this.cacheStore.delete(key)
      }
    }
    const [url, init] = await this.applyRequestInterceptors(
      this.baseUrl + path,
      { method: "GET", headers: this.headers }
    )
    const finalInit = await this.withAuth(init)
    let res = await fetch(url, finalInit)
    res = await this.applyResponseInterceptors(res)
    const data = await res.json()
    if (this.cacheEnabled) {
      this.cacheStore.set(key, {
        value: data,
        expires: now + this.cacheDuration,
      })
    }
    return data
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const [url, init] = await this.applyRequestInterceptors(
      this.baseUrl + path,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    )
    const finalInit = await this.withAuth(init)
    let res = await fetch(url, finalInit)
    res = await this.applyResponseInterceptors(res)
    return res.json()
  }

  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const [url, init] = await this.applyRequestInterceptors(
      this.baseUrl + path,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    )
    const finalInit = await this.withAuth(init)
    let res = await fetch(url, finalInit)
    res = await this.applyResponseInterceptors(res)
    return res.json()
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const [url, init] = await this.applyRequestInterceptors(
      this.baseUrl + path,
      {
        method: "DELETE",
        headers: this.headers,
      }
    )
    const finalInit = await this.withAuth(init)
    let res = await fetch(url, finalInit)
    res = await this.applyResponseInterceptors(res)
    if (res.status === 204) return undefined as T
    return res.json()
  }

  clearCache() {
    this.cacheStore.clear()
  }
}
