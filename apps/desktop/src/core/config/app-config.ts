/**
 * Application configuration manager
 * Centralized configuration with type safety and environment support
 */

import { app } from "electron"
import * as path from "path"

export interface AppConfig {
  // FastAPI Configuration
  fastAPI: {
    host: string
    port: number
    apiPath?: string
    pythonPath?: string
  }

  // Application Paths
  paths: {
    userData: string
    apiPath: string
  }

  // Environment
  environment: {
    isPackaged: boolean
    isDev: boolean
  }

  // Progress Reporting
  onProgress?: (message: string, percent?: number) => void
}

export class AppConfigManager {
  private config: AppConfig

  constructor(overrides?: Partial<AppConfig>) {
    const isPackaged = app?.isPackaged ?? false
    const userDataPath =
      app?.getPath("userData") ?? path.join(process.cwd(), "userData")

    // Calculate API path: from dist/core/config -> apps/api
    // In dev: src/core/config -> apps/api (../../../../api)
    // In prod: dist/core/config -> apps/api (../../../../api)
    const apiPath = path.resolve(__dirname, "../../../../api")

    this.config = {
      fastAPI: {
        host: "localhost",
        port: 8000,
        apiPath,
        ...overrides?.fastAPI,
      },
      paths: {
        userData: userDataPath,
        apiPath: overrides?.paths?.apiPath ?? apiPath,
      },
      environment: {
        isPackaged,
        isDev: !isPackaged,
      },
      onProgress: overrides?.onProgress,
      ...overrides,
    }
  }

  getConfig(): AppConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      fastAPI: {
        ...this.config.fastAPI,
        ...updates.fastAPI,
      },
      paths: {
        ...this.config.paths,
        ...updates.paths,
      },
      environment: {
        ...this.config.environment,
        ...updates.environment,
      },
    }
  }

  getFastAPIConfig() {
    return this.config.fastAPI
  }

  getPaths() {
    return this.config.paths
  }

  getEnvironment() {
    return this.config.environment
  }

  setProgressCallback(
    callback: (message: string, percent?: number) => void
  ): void {
    this.config.onProgress = callback
  }

  getProgressCallback() {
    return this.config.onProgress
  }
}
