/**
 * API Bridge Service
 * Main service coordinating lifecycle and client
 * Implements bridge pattern between Electron and FastAPI
 * Exposes unified interface for Electron app
 */

import { FastAPIClient } from "./fastapi-client"
import {
  FastAPILifecycleService,
  IFastAPILifecycleService,
} from "./fastapi-lifecycle-service"
import {
  FastAPIServerConfig,
  FastAPIStartOptions,
  FastAPIServerStatus,
} from "./types"
import { IPythonEnvironmentManager } from "../../core/python/interfaces"
import { IProcessManager } from "../../core/process/process-manager"

export interface IAPIBridgeService {
  start(options: FastAPIStartOptions): Promise<void>
  stop(): Promise<void>
  restart(options: FastAPIStartOptions): Promise<void>
  isServerRunning(): boolean
  getStatus(): FastAPIServerStatus
  getClient(): FastAPIClient
  healthCheck(): Promise<boolean>
}

export class APIBridgeService implements IAPIBridgeService {
  private lifecycleService: IFastAPILifecycleService
  private client: FastAPIClient
  private config: FastAPIServerConfig

  constructor(
    config: FastAPIServerConfig,
    pythonEnvManager: IPythonEnvironmentManager,
    processManager: IProcessManager
  ) {
    this.config = config
    this.lifecycleService = new FastAPILifecycleService(
      config,
      pythonEnvManager,
      processManager
    )
    this.client = new FastAPIClient({
      baseURL: `http://${config.host}:${config.port}`,
      timeout: 30000,
    })
  }

  /**
   * Start the FastAPI server
   */
  async start(options: FastAPIStartOptions): Promise<void> {
    await this.lifecycleService.start(options)
    // Update client base URL in case it changed
    this.client.updateBaseURL(`http://${this.config.host}:${this.config.port}`)
  }

  /**
   * Stop the FastAPI server
   */
  async stop(): Promise<void> {
    await this.lifecycleService.stop()
  }

  /**
   * Restart the FastAPI server
   */
  async restart(options: FastAPIStartOptions): Promise<void> {
    await this.lifecycleService.restart(options)
    this.client.updateBaseURL(`http://${this.config.host}:${this.config.port}`)
  }

  /**
   * Check if the server is running
   */
  isServerRunning(): boolean {
    return this.lifecycleService.isRunning()
  }

  /**
   * Get server status
   */
  getStatus(): FastAPIServerStatus {
    return this.lifecycleService.getStatus()
  }

  /**
   * Get the HTTP client for API calls
   */
  getClient(): FastAPIClient {
    if (!this.isServerRunning()) {
      throw new Error("FastAPI server is not running")
    }
    return this.client
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isServerRunning()) {
      return false
    }
    return await this.client.healthCheck()
  }

  /**
   * Make a GET request (convenience method)
   */
  async get<T = any>(url: string): Promise<T> {
    return this.getClient().get<T>(url)
  }

  /**
   * Make a POST request (convenience method)
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    return this.getClient().post<T>(url, data)
  }

  /**
   * Make a PUT request (convenience method)
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    return this.getClient().put<T>(url, data)
  }

  /**
   * Make a DELETE request (convenience method)
   */
  async delete<T = any>(url: string): Promise<T> {
    return this.getClient().delete<T>(url)
  }
}
