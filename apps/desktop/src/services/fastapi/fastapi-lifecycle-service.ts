/**
 * FastAPI Lifecycle Service
 * Handles server start/stop/restart and health checks
 * Depends on PythonEnvironmentManager and ProcessManager
 */

import { ChildProcess } from "child_process"
import * as path from "path"
import * as fs from "fs"
import { IPythonEnvironmentManager } from "../../core/python/interfaces"
import {
  IProcessManager,
  ProcessSpawnOptions,
} from "../../core/process/process-manager"
import { FastAPIServerConfig, FastAPIStartOptions } from "./types"

export interface IFastAPILifecycleService {
  start(options: FastAPIStartOptions): Promise<void>
  stop(): Promise<void>
  restart(options: FastAPIStartOptions): Promise<void>
  isRunning(): boolean
  getStatus(): FastAPIServerStatus
  waitForReady(timeout?: number): Promise<void>
}

export interface FastAPIServerStatus {
  running: boolean
  port: number
  host: string
  baseURL: string
}

export class FastAPILifecycleService implements IFastAPILifecycleService {
  private process: ChildProcess | null = null
  private _isRunning: boolean = false
  private config: FastAPIServerConfig
  private pythonEnvManager: IPythonEnvironmentManager
  private processManager: IProcessManager
  private startupPromise: Promise<void> | null = null

  constructor(
    config: FastAPIServerConfig,
    pythonEnvManager: IPythonEnvironmentManager,
    processManager: IProcessManager
  ) {
    this.config = config
    this.pythonEnvManager = pythonEnvManager
    this.processManager = processManager
  }

  /**
   * Start the FastAPI server
   */
  async start(options: FastAPIStartOptions): Promise<void> {
    if (this._isRunning) {
      console.log("[FastAPILifecycle] Server is already running")
      return
    }

    if (this.startupPromise) {
      return this.startupPromise
    }

    this.startupPromise = this._startServer(options)
    return this.startupPromise
  }

  private async _startServer(options: FastAPIStartOptions): Promise<void> {
    try {
      this.reportProgress("Starting FastAPI server...", 10, options.onProgress)

      // Check if API directory exists
      if (!fs.existsSync(options.apiPath)) {
        throw new Error(`API directory not found: ${options.apiPath}`)
      }

      // Ensure userData directory exists
      if (!fs.existsSync(options.userDataPath)) {
        fs.mkdirSync(options.userDataPath, { recursive: true })
      }

      // Setup Python environment
      this.reportProgress(
        "Setting up Python environment...",
        20,
        options.onProgress
      )

      if (options.onProgress) {
        this.pythonEnvManager.setProgressCallback?.(options.onProgress)
      }

      const pythonPath = await this.pythonEnvManager.ensureEnvironment(
        options.apiPath,
        options.userDataPath
      )

      // Determine Python path (use venv if available, otherwise system)
      const finalPythonPath = pythonPath || this.config.pythonPath
      if (!finalPythonPath) {
        throw new Error("Python executable not found")
      }

      // Prepare environment variables
      const env = this.getPythonEnv({
        ENVIRONMENT: "local",
        SQLITE_PATH: path.join(options.userDataPath, "vailabel.db"),
        DEBUG: "false",
        PYTHONPATH: options.apiPath,
      })

      // Start the FastAPI server
      this.reportProgress("Starting server process...", 80, options.onProgress)

      // Verify Python path exists before spawning
      if (!fs.existsSync(finalPythonPath)) {
        throw new Error(
          `Python executable not found: ${finalPythonPath}. Please ensure Python is installed.`
        )
      }

      const spawnOptions: ProcessSpawnOptions = {
        cwd: options.apiPath,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      }

      console.log(
        `[FastAPILifecycle] Spawning Python process: ${finalPythonPath}`
      )
      console.log(`[FastAPILifecycle] Working directory: ${options.apiPath}`)

      this.process = this.processManager.spawn(
        finalPythonPath,
        [
          "-m",
          "uvicorn",
          "main:app",
          "--host",
          this.config.host,
          "--port",
          this.config.port.toString(),
        ],
        spawnOptions
      )

      if (!this.process) {
        throw new Error("Failed to start FastAPI process")
      }

      // Monitor process
      this.processManager.monitor(this.process, {
        onStdout: (data: string) => {
          console.log("[FastAPILifecycle] stdout:", data)
        },
        onStderr: (data: string) => {
          console.error("[FastAPILifecycle] stderr:", data)
        },
        onExit: (code: number | null, signal: NodeJS.Signals | null) => {
          console.log(
            `[FastAPILifecycle] Process exited with code ${code}, signal ${signal}`
          )
          this._isRunning = false
          this.process = null
          this.startupPromise = null
        },
        onError: (error: Error) => {
          console.error("[FastAPILifecycle] Process error:", error)
          this._isRunning = false
        },
      })

      // Wait for server to be ready
      this.reportProgress(
        "Waiting for server to be ready...",
        90,
        options.onProgress
      )
      await this.waitForReady(30000)

      this._isRunning = true
      this.reportProgress(
        `Server started successfully on http://${this.config.host}:${this.config.port}`,
        100,
        options.onProgress
      )
      this.startupPromise = null
    } catch (error) {
      console.error("[FastAPILifecycle] Failed to start server:", error)
      this._isRunning = false
      this.startupPromise = null
      throw error
    }
  }

  /**
   * Stop the FastAPI server
   */
  async stop(): Promise<void> {
    if (!this.process) {
      console.log("[FastAPILifecycle] Server is not running")
      return
    }

    try {
      console.log("[FastAPILifecycle] Stopping server...")
      await this.processManager.kill(this.process, "SIGTERM")
      this.process = null
      this._isRunning = false
      this.startupPromise = null
      console.log("[FastAPILifecycle] Server stopped")
    } catch (error) {
      console.error("[FastAPILifecycle] Error stopping server:", error)
      throw error
    }
  }

  /**
   * Restart the FastAPI server
   */
  async restart(options: FastAPIStartOptions): Promise<void> {
    await this.stop()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await this.start(options)
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this._isRunning
  }

  /**
   * Get server status
   */
  getStatus(): FastAPIServerStatus {
    return {
      running: this._isRunning,
      port: this.config.port,
      host: this.config.host,
      baseURL: `http://${this.config.host}:${this.config.port}`,
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForReady(timeout: number = 30000): Promise<void> {
    const maxAttempts = 30
    const delay = 1000
    const startTime = Date.now()

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (Date.now() - startTime > timeout) {
        throw new Error("Server failed to start within timeout")
      }

      try {
        const response = await fetch(
          `http://${this.config.host}:${this.config.port}/docs`
        )
        if (response.ok) {
          console.log("[FastAPILifecycle] Server is ready")
          return
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      if (attempt === maxAttempts) {
        throw new Error("Server failed to start within timeout")
      }

      console.log(
        `[FastAPILifecycle] Waiting for server... (attempt ${attempt}/${maxAttempts})`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  /**
   * Get environment variables with UTF-8 encoding for Python processes
   */
  private getPythonEnv(
    baseEnv: Record<string, string> = {}
  ): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...baseEnv,
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    }
  }

  private reportProgress(
    message: string,
    percent?: number,
    callback?: (message: string, percent?: number) => void
  ): void {
    if (callback) {
      callback(message, percent)
    }
    console.log(`[FastAPILifecycle] ${message}`)
  }
}
