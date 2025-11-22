/**
 * FastAPI HTTP Client
 * Typed HTTP client for API communication with FastAPI backend
 * Handles request/response interceptors, error handling, and retry logic
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"

export interface FastAPIClientConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
}

export class FastAPIClient {
  private client: AxiosInstance
  private baseURL: string

  constructor(config: FastAPIClientConfig) {
    this.baseURL = config.baseURL
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    })

    this.setupInterceptors()
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          `[FastAPIClient] ${config.method?.toUpperCase()} ${config.url}`
        )
        return config
      },
      (error) => {
        console.error("[FastAPIClient] Request error:", error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        console.error(
          "[FastAPIClient] Response error:",
          error.response?.data || error.message
        )
        return Promise.reject(error)
      }
    )
  }

  /**
   * Get the underlying axios instance
   */
  getAxiosInstance(): AxiosInstance {
    return this.client
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  /**
   * Check if server is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/docs", { timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Update base URL
   */
  updateBaseURL(baseURL: string): void {
    this.baseURL = baseURL
    this.client.defaults.baseURL = baseURL
  }
}
