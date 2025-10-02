/**
 * HTTP API Client for FastAPI Backend
 * Provides a unified interface for making HTTP requests with authentication, caching, and error handling
 */

export interface ApiClientConfig {
  baseUrl: string
  headers?: Record<string, string>
  getAuthToken?: () => Promise<string | null>
  cache?: boolean
  cacheDuration?: number
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers?: Record<string, string>
  body?: any
  cache?: boolean
}

interface CacheEntry {
  data: any
  timestamp: number
  duration: number
}

export class ApiClient {
  private config: ApiClientConfig
  private cache: Map<string, CacheEntry> = new Map()

  constructor(config: ApiClientConfig) {
    this.config = config
  }

  private getCacheKey(url: string, options?: RequestOptions): string {
    const method = options?.method || "GET"
    const body = options?.body ? JSON.stringify(options.body) : ""
    return `${method}:${url}:${body}`
  }

  private getFromCache(key: string): any | null {
    if (!this.config.cache) return null

    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.duration) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private setCache(key: string, data: any): void {
    if (!this.config.cache) return

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration: this.config.cacheDuration || 5 * 60 * 1000, // 5 minutes default
    })
  }

  private async buildHeaders(
    options?: RequestOptions
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
      ...options?.headers,
    }

    // Add authentication token if available
    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken()
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }

    return headers
  }

  private async makeRequest<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const fullUrl = `${this.config.baseUrl}${url}`
    const method = options.method || "GET"
    const headers = await this.buildHeaders(options)

    // Check cache for GET requests
    if (method === "GET" && options.cache !== false) {
      const cacheKey = this.getCacheKey(url, options)
      const cachedData = this.getFromCache(cacheKey)
      if (cachedData) {
        return cachedData
      }
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    }

    // Add body for non-GET requests
    if (method !== "GET" && options.body) {
      if (options.body instanceof FormData) {
        // Remove Content-Type header for FormData (browser will set it with boundary)
        delete headers["Content-Type"]
        requestOptions.body = options.body
      } else {
        requestOptions.body = JSON.stringify(options.body)
      }
    }

    try {
      const response = await fetch(fullUrl, requestOptions)

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          // If response is not JSON, use the status text
        }

        throw new Error(errorMessage)
      }

      // Parse response
      let data: T
      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        // For non-JSON responses, return the response object
        data = response as unknown as T
      }

      // Cache successful GET responses
      if (method === "GET" && options.cache !== false) {
        const cacheKey = this.getCacheKey(url, options)
        this.setCache(cacheKey, data)
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Request failed: ${String(error)}`)
    }
  }

  async get<T>(
    url: string,
    options?: Omit<RequestOptions, "method">
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: "GET" })
  }

  async post<T>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: "POST", body })
  }

  async put<T>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: "PUT", body })
  }

  async patch<T>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: "PATCH", body })
  }

  async delete<T>(
    url: string,
    options?: Omit<RequestOptions, "method">
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: "DELETE" })
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear()
  }

  removeFromCache(url: string, options?: RequestOptions): void {
    const cacheKey = this.getCacheKey(url, options)
    this.cache.delete(cacheKey)
  }

  getBaseUrl(): string {
    return this.config.baseUrl
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.get("/health")
      return true
    } catch {
      return false
    }
  }
}
