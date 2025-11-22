/**
 * FastAPI service for Electron desktop app
 * This service handles communication with the local FastAPI backend
 * Cross-platform Python installation and virtual environment management
 */

import { spawn, ChildProcess, execSync } from "child_process"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import axios, { AxiosInstance } from "axios"

export interface FastAPIConfig {
  port: number
  host: string
  pythonPath?: string
  apiPath?: string
  isPackaged?: boolean
  userDataPath?: string
  onProgress?: (message: string, percent?: number) => void
}

type Platform = "win32" | "darwin" | "linux"

export class FastAPIService {
  private process: ChildProcess | null = null
  public config: FastAPIConfig
  private client: AxiosInstance
  private isRunning: boolean = false
  private startupPromise: Promise<void> | null = null
  private platform: Platform
  private venvPath: string | null = null
  private pythonPath: string | null = null

  constructor(config: FastAPIConfig = { port: 8000, host: "localhost" }) {
    this.config = config
    this.platform = process.platform as Platform
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

  private reportProgress(message: string, percent?: number): void {
    if (this.config.onProgress) {
      this.config.onProgress(message, percent)
    }
    console.log(`[FastAPI] ${message}`)
  }

  /**
   * Get environment variables with UTF-8 encoding for Python processes
   */
  private _getPythonEnv(
    baseEnv: Record<string, string> = {}
  ): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...baseEnv,
      // Set UTF-8 encoding for Python to handle Unicode characters (emojis) on Windows
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    }
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
      this.reportProgress("Starting FastAPI server...", 10)

      const isDev = !(this.config.isPackaged ?? false)
      const apiPath =
        this.config.apiPath || path.join(__dirname, "../../../api")

      // Check if API directory exists
      if (!fs.existsSync(apiPath)) {
        throw new Error(`API directory not found: ${apiPath}`)
      }

      // Set environment variables
      const userDataPath =
        this.config.userDataPath || path.join(process.cwd(), "userData")

      // Ensure userData directory exists
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }

      // Setup Python environment
      this.reportProgress("Setting up Python environment...", 20)
      await this._ensurePythonEnvironment(apiPath, userDataPath)

      // Determine Python path (use venv if available, otherwise system)
      const pythonPath =
        this.pythonPath || this.config.pythonPath || this._findPythonPathSync()

      if (!pythonPath) {
        throw new Error("Python executable not found")
      }

      const env = this._getPythonEnv({
        ENVIRONMENT: "local",
        SQLITE_PATH: path.join(userDataPath, "vailabel.db"),
        DEBUG: isDev ? "true" : "false",
        PYTHONPATH: apiPath,
      })

      // Start the FastAPI server
      this.reportProgress("Starting server process...", 80)
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
      if (!this.process) {
        throw new Error("Failed to start FastAPI process")
      }

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
      this.reportProgress("Waiting for server to be ready...", 90)
      await this._waitForServer()

      this.isRunning = true
      this.reportProgress(
        `Server started successfully on http://${this.config.host}:${this.config.port}`,
        100
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
   * Ensure Python environment is set up (check Python, create venv, install deps)
   */
  private async _ensurePythonEnvironment(
    apiPath: string,
    userDataPath: string
  ): Promise<void> {
    // Step 1: Find or install Python
    this.reportProgress("Checking for Python installation...", 25)
    let systemPython = await this._findOrInstallPython()

    // Step 2: Create virtual environment if it doesn't exist
    this.reportProgress("Setting up virtual environment...", 40)
    const venvPath = path.join(userDataPath, "venv")
    await this._ensureVirtualEnvironment(systemPython, venvPath)

    // Step 3: Install dependencies
    this.reportProgress("Installing Python dependencies...", 60)
    await this._installDependencies(apiPath, venvPath)

    // Store paths for later use
    this.venvPath = venvPath
    this.pythonPath = this._getVenvPythonPath(venvPath)
  }

  /**
   * Find or install Python
   */
  private async _findOrInstallPython(): Promise<string> {
    // First, try to find existing Python
    const pythonPath = await this._findPythonPath()
    if (pythonPath) {
      this.reportProgress("Python found", 30)
      return pythonPath
    }

    // Python not found, try to install it
    this.reportProgress("Python not found, attempting to install...", 30)
    return await this._installPython()
  }

  /**
   * Find Python executable path (cross-platform)
   */
  private async _findPythonPath(): Promise<string | null> {
    const possiblePaths = this._getPythonSearchPaths()

    for (const pythonPath of possiblePaths) {
      if (await this._testPythonPath(pythonPath)) {
        return pythonPath
      }
    }

    return null
  }

  /**
   * Get platform-specific Python search paths
   */
  private _getPythonSearchPaths(): string[] {
    const paths: string[] = []

    if (this.platform === "win32") {
      paths.push(
        // Windows Python launcher
        "py",
        "python",
        "python3",
        // Common installation paths
        "C:\\Python39\\python.exe",
        "C:\\Python310\\python.exe",
        "C:\\Python311\\python.exe",
        "C:\\Python312\\python.exe",
        "C:\\Python313\\python.exe",
        // AppData paths
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "Programs",
          "Python",
          "Python39",
          "python.exe"
        ),
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "Programs",
          "Python",
          "Python310",
          "python.exe"
        ),
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "Programs",
          "Python",
          "Python311",
          "python.exe"
        ),
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "Programs",
          "Python",
          "Python312",
          "python.exe"
        ),
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "Programs",
          "Python",
          "Python313",
          "python.exe"
        )
      )
    } else if (this.platform === "darwin") {
      paths.push(
        // macOS system Python
        "python3",
        "python",
        // Homebrew Python
        "/opt/homebrew/bin/python3",
        "/usr/local/bin/python3",
        // System Python
        "/usr/bin/python3"
      )
    } else {
      // Linux
      paths.push(
        "python3",
        "python",
        "/usr/bin/python3",
        "/usr/local/bin/python3"
      )
    }

    return paths
  }

  /**
   * Test if a Python path is valid
   */
  private async _testPythonPath(pythonPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const testProcess = spawn(pythonPath, ["--version"], {
          stdio: "pipe",
          shell: this.platform === "win32",
        })

        let output = ""
        testProcess.stdout?.on("data", (data) => {
          output += data.toString()
        })

        testProcess.on("exit", (code) => {
          resolve(code === 0 && output.includes("Python"))
        })

        testProcess.on("error", () => {
          resolve(false)
        })

        // Timeout after 5 seconds
        setTimeout(() => {
          try {
            testProcess.kill()
          } catch {}
          resolve(false)
        }, 5000)
      } catch {
        resolve(false)
      }
    })
  }

  /**
   * Install Python using platform-specific methods
   */
  private async _installPython(): Promise<string> {
    this.reportProgress("Installing Python...", 32)

    if (this.platform === "win32") {
      return await this._installPythonWindows()
    } else if (this.platform === "darwin") {
      return await this._installPythonMacOS()
    } else {
      return await this._installPythonLinux()
    }
  }

  /**
   * Install Python on Windows
   */
  private async _installPythonWindows(): Promise<string> {
    // Try winget first (Windows 10/11)
    if (
      await this._runCommand(
        "winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements"
      )
    ) {
      await this._waitForCommand("python --version", 10000)
      const python = await this._findPythonPath()
      if (python) return python
    }

    // Try chocolatey
    if (await this._runCommand("choco install python3 -y")) {
      await this._waitForCommand("python --version", 10000)
      const python = await this._findPythonPath()
      if (python) return python
    }

    throw new Error(
      "Python installation failed. Please install Python 3.9+ manually from https://www.python.org/downloads/"
    )
  }

  /**
   * Install Python on macOS
   */
  private async _installPythonMacOS(): Promise<string> {
    // Try Homebrew
    if (await this._runCommand("brew install python3")) {
      await this._waitForCommand("python3 --version", 10000)
      const python = await this._findPythonPath()
      if (python) return python
    }

    throw new Error(
      "Python installation failed. Please install Python 3.9+ manually:\n" +
        "  brew install python3\n" +
        "Or download from https://www.python.org/downloads/"
    )
  }

  /**
   * Install Python on Linux
   */
  private async _installPythonLinux(): Promise<string> {
    // Try different package managers
    const commands = [
      "apt-get update && apt-get install -y python3 python3-pip python3-venv",
      "yum install -y python3 python3-pip",
      "dnf install -y python3 python3-pip",
      "pacman -S --noconfirm python python-pip",
    ]

    for (const cmd of commands) {
      if (await this._runCommand(cmd, true)) {
        await this._waitForCommand("python3 --version", 10000)
        const python = await this._findPythonPath()
        if (python) return python
        break
      }
    }

    throw new Error(
      "Python installation failed. Please install Python 3.9+ manually:\n" +
        "  Ubuntu/Debian: sudo apt-get install python3 python3-pip python3-venv\n" +
        "  Fedora: sudo dnf install python3 python3-pip\n" +
        "  Arch: sudo pacman -S python python-pip"
    )
  }

  /**
   * Run a command and return success status
   */
  private async _runCommand(
    command: string,
    needsSudo: boolean = false
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const fullCommand =
          needsSudo && this.platform !== "win32" ? `sudo ${command}` : command

        const proc = spawn(fullCommand, [], {
          shell: true,
          stdio: "pipe",
        })

        proc.on("exit", (code) => {
          resolve(code === 0)
        })

        proc.on("error", () => {
          resolve(false)
        })

        // Timeout after 5 minutes
        setTimeout(() => {
          try {
            proc.kill()
          } catch {}
          resolve(false)
        }, 300000)
      } catch {
        resolve(false)
      }
    })
  }

  /**
   * Wait for a command to succeed
   */
  private async _waitForCommand(
    command: string,
    timeout: number
  ): Promise<boolean> {
    const start = Date.now()
    const pythonCommand = command.split(" ")[0]
    while (Date.now() - start < timeout) {
      if (await this._testPythonPath(pythonCommand)) {
        return true
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    return false
  }

  /**
   * Ensure virtual environment exists and is set up
   */
  private async _ensureVirtualEnvironment(
    pythonPath: string,
    venvPath: string
  ): Promise<void> {
    const venvPython = this._getVenvPythonPath(venvPath)

    // Check if venv already exists
    if (fs.existsSync(venvPath) && fs.existsSync(venvPython)) {
      this.reportProgress("Virtual environment found", 45)
      return
    }

    // Create virtual environment
    this.reportProgress("Creating virtual environment...", 42)
    await this._createVirtualEnvironment(pythonPath, venvPath)
  }

  /**
   * Create a virtual environment
   */
  private async _createVirtualEnvironment(
    pythonPath: string,
    venvPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ["-m", "venv", venvPath]
      const proc = spawn(pythonPath, args, {
        stdio: "pipe",
        shell: this.platform === "win32",
        env: this._getPythonEnv(),
      })

      let errorOutput = ""
      proc.stderr?.on("data", (data) => {
        errorOutput += data.toString()
      })

      proc.on("exit", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(
            new Error(
              `Failed to create virtual environment: ${
                errorOutput || "Unknown error"
              }`
            )
          )
        }
      })

      proc.on("error", (error) => {
        reject(
          new Error(`Failed to create virtual environment: ${error.message}`)
        )
      })
    })
  }

  /**
   * Get Python executable path from virtual environment
   */
  private _getVenvPythonPath(venvPath: string): string {
    if (this.platform === "win32") {
      return path.join(venvPath, "Scripts", "python.exe")
    } else {
      return path.join(venvPath, "bin", "python")
    }
  }

  /**
   * Install dependencies in virtual environment
   */
  private async _installDependencies(
    apiPath: string,
    venvPath: string
  ): Promise<void> {
    const venvPython = this._getVenvPythonPath(venvPath)
    const requirementsPath = path.join(apiPath, "requirements.txt")

    if (!fs.existsSync(requirementsPath)) {
      throw new Error(`Requirements file not found: ${requirementsPath}`)
    }

    return new Promise((resolve, reject) => {
      // Upgrade pip first
      const pipUpgrade = spawn(
        venvPython,
        ["-m", "pip", "install", "--upgrade", "pip"],
        {
          cwd: apiPath,
          stdio: "pipe",
          shell: this.platform === "win32",
          env: this._getPythonEnv(),
        }
      )

      pipUpgrade.on("exit", (code) => {
        if (code !== 0) {
          console.warn("[FastAPI] pip upgrade failed, continuing anyway...")
        }

        // Install requirements
        const installProc = spawn(
          venvPython,
          ["-m", "pip", "install", "-r", requirementsPath],
          {
            cwd: apiPath,
            stdio: "pipe",
            shell: this.platform === "win32",
            env: this._getPythonEnv(),
          }
        )

        let output = ""
        installProc.stdout?.on("data", (data) => {
          output += data.toString()
          // Show progress from pip output
          if (
            data.toString().includes("Installing") ||
            data.toString().includes("Collecting")
          ) {
            this.reportProgress("Installing dependencies...", 65)
          }
        })

        installProc.stderr?.on("data", (data) => {
          output += data.toString()
        })

        installProc.on("exit", (code) => {
          if (code === 0) {
            this.reportProgress("Dependencies installed successfully", 75)
            resolve()
          } else {
            reject(
              new Error(
                `Failed to install dependencies: ${output || "Unknown error"}`
              )
            )
          }
        })

        installProc.on("error", (error) => {
          reject(new Error(`Failed to install dependencies: ${error.message}`))
        })
      })

      pipUpgrade.on("error", (error) => {
        console.warn("[FastAPI] pip upgrade error:", error)
        // Continue anyway
      })
    })
  }

  /**
   * Find Python executable path synchronously (fallback for when venv is not used)
   */
  private _findPythonPathSync(): string {
    // If we have a venv Python, use it
    if (this.pythonPath) {
      return this.pythonPath
    }

    // Otherwise, try to find system Python
    const possiblePaths = [
      // System Python
      this.platform === "win32" ? "py" : "python3",
      "python",
    ]

    for (const pythonPath of possiblePaths) {
      try {
        // Quick synchronous check (timeout handled by spawn in async version)
        execSync(`${pythonPath} --version`, { stdio: "ignore" })
        return pythonPath
      } catch {
        // Continue to next path
      }
    }

    throw new Error(
      "Python executable not found. Please install Python 3.9+ or specify pythonPath in config."
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
