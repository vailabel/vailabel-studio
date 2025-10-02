/**
 * FastAPI service for Electron desktop app
 * This service handles communication with the local FastAPI backend
 */

import { spawn, ChildProcess } from "child_process"
import * as path from "path"
import * as fs from "fs"
import axios, { AxiosInstance } from "axios"

export interface FastAPIConfig {
  port: number
  host: string
  pythonPath?: string
  apiPath?: string
  isPackaged?: boolean
  userDataPath?: string
}

export class FastAPIService {
  private process: ChildProcess | null = null
  public config: FastAPIConfig
  private client: AxiosInstance
  private isRunning: boolean = false
  private startupPromise: Promise<void> | null = null

  constructor(config: FastAPIConfig = { port: 8000, host: "localhost" }) {
    this.config = config
    this.client = axios.create({
      baseURL: `http://${config.host}:${config.port}`,
      timeout: 30000,
    })

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[FastAPI] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error("[FastAPI] Request error:", error)
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        console.error(
          "[FastAPI] Response error:",
          error.response?.data || error.message
        )
        return Promise.reject(error)
      }
    )
  }

  /**
   * Start the FastAPI server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[FastAPI] Server is already running")
      return
    }

    if (this.startupPromise) {
      return this.startupPromise
    }

    this.startupPromise = this._startServer()
    return this.startupPromise
  }

  private async _startServer(): Promise<void> {
    try {
      console.log("[FastAPI] Starting FastAPI server...")

      const isDev = !(this.config.isPackaged ?? false)
      const apiPath =
        this.config.apiPath || path.join(__dirname, "../../../api")

      // Check if API directory exists
      if (!fs.existsSync(apiPath)) {
        throw new Error(`API directory not found: ${apiPath}`)
      }

      // Determine Python path
      const pythonPath = this.config.pythonPath || this._findPythonPath()

      // Set environment variables
      const userDataPath =
        this.config.userDataPath || path.join(process.cwd(), "userData")

      // Ensure userData directory exists
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }

      const env = {
        ...process.env,
        ENVIRONMENT: "local",
        SQLITE_PATH: path.join(userDataPath, "vailabel.db"),
        DEBUG: isDev ? "true" : "false",
        PYTHONPATH: apiPath,
      }

      // Start the FastAPI server
      this.process = spawn(
        pythonPath,
        [
          "-m",
          "uvicorn",
          "main:app",
          "--host",
          this.config.host,
          "--port",
          this.config.port.toString(),
        ],
        {
          cwd: apiPath,
          env,
          stdio: ["pipe", "pipe", "pipe"],
        }
      )

      // Handle process events
      this.process.on("error", (error) => {
        console.error("[FastAPI] Process error:", error)
        this.isRunning = false
      })

      this.process.on("exit", (code, signal) => {
        console.log(
          `[FastAPI] Process exited with code ${code}, signal ${signal}`
        )
        this.isRunning = false
        this.process = null
      })

      // Capture stdout and stderr for debugging
      this.process.stdout?.on("data", (data) => {
        console.log("[FastAPI] stdout:", data.toString())
      })

      this.process.stderr?.on("data", (data) => {
        console.error("[FastAPI] stderr:", data.toString())
      })

      // Wait for server to be ready
      await this._waitForServer()

      this.isRunning = true
      console.log(
        `[FastAPI] Server started successfully on http://${this.config.host}:${this.config.port}`
      )
    } catch (error) {
      console.error("[FastAPI] Failed to start server:", error)
      this.isRunning = false
      throw error
    }
  }

  /**
   * Stop the FastAPI server
   */
  async stop(): Promise<void> {
    if (!this.process) {
      console.log("[FastAPI] Server is not running")
      return
    }

    try {
      console.log("[FastAPI] Stopping server...")
      this.process.kill("SIGTERM")

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        if (this.process) {
          this.process.on("exit", () => resolve())
          // Force kill after 5 seconds
          setTimeout(() => {
            if (this.process) {
              this.process.kill("SIGKILL")
              resolve()
            }
          }, 5000)
        } else {
          resolve()
        }
      })

      this.process = null
      this.isRunning = false
      console.log("[FastAPI] Server stopped")
    } catch (error) {
      console.error("[FastAPI] Error stopping server:", error)
      throw error
    }
  }

  /**
   * Check if the server is running
   */
  isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get the HTTP client for API calls
   */
  getClient(): AxiosInstance {
    if (!this.isRunning) {
      throw new Error("FastAPI server is not running")
    }
    return this.client
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }

  /**
   * Wait for server to be ready
   */
  private async _waitForServer(): Promise<void> {
    const maxAttempts = 30
    const delay = 1000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.client.get("/docs")
        console.log("[FastAPI] Server is ready")
        return
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error("Server failed to start within timeout")
        }
        console.log(
          `[FastAPI] Waiting for server... (attempt ${attempt}/${maxAttempts})`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * Find Python executable path
   */
  private _findPythonPath(): string {
    const possiblePaths = [
      // API directory virtual environment (highest priority)
      path.join(__dirname, "../../../api/.venv/bin/python"),
      path.join(__dirname, "../../../api/.venv/Scripts/python.exe"),
      // System Python
      "python3",
      "python",
      "py",
      // Other common venv locations
      path.join(process.cwd(), "venv", "bin", "python"),
      path.join(process.cwd(), ".venv", "bin", "python"),
      path.join(process.cwd(), "venv", "Scripts", "python.exe"),
      path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    ]

    for (const pythonPath of possiblePaths) {
      try {
        // Try to spawn python to check if it exists
        const testProcess = spawn(pythonPath, ["--version"], { stdio: "pipe" })
        if (testProcess.pid) {
          testProcess.kill()
          return pythonPath
        }
      } catch (error) {
        // Continue to next path
      }
    }

    throw new Error(
      "Python executable not found. Please install Python or specify pythonPath in config."
    )
  }

  /**
   * Get server status
   */
  async getStatus(): Promise<{ running: boolean; port: number; host: string }> {
    return {
      running: this.isRunning,
      port: this.config.port,
      host: this.config.host,
    }
  }
}

// Global instance
export const fastApiService = new FastAPIService()
