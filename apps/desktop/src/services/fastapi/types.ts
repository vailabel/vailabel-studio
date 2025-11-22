/**
 * Type definitions for FastAPI services
 */

export interface FastAPIServerConfig {
  host: string
  port: number
  apiPath: string
  pythonPath?: string
}

export interface FastAPIServerStatus {
  running: boolean
  port: number
  host: string
  baseURL: string
}

export interface FastAPIStartOptions {
  apiPath: string
  userDataPath: string
  onProgress?: (message: string, percent?: number) => void
}
