/**
 * Python Environment Manager
 * Handles Python detection, installation, and virtual environment management
 * Single responsibility: Python environment setup
 */

import { spawn, execSync } from "child_process"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import {
  IPythonEnvironmentManager,
  PythonEnvironmentConfig,
} from "./interfaces"

type Platform = "win32" | "darwin" | "linux"

export class PythonEnvironmentManager implements IPythonEnvironmentManager {
  private platform: Platform
  private venvPath: string | null = null
  private pythonPath: string | null = null
  private onProgress?: (message: string, percent?: number) => void

  constructor() {
    this.platform = process.platform as Platform
  }

  setProgressCallback(
    callback: (message: string, percent?: number) => void
  ): void {
    this.onProgress = callback
  }

  private reportProgress(message: string, percent?: number): void {
    if (this.onProgress) {
      this.onProgress(message, percent)
    }
    console.log(`[PythonEnv] ${message}`)
  }

  /**
   * Ensure Python environment is set up
   */
  async ensureEnvironment(
    apiPath: string,
    userDataPath: string
  ): Promise<string> {
    // Step 1: Find or install Python
    this.reportProgress("Checking for Python installation...", 25)
    let systemPython = await this.findOrInstallPython()

    // Step 2: Create virtual environment if it doesn't exist
    this.reportProgress("Setting up virtual environment...", 40)
    const venvPath = path.join(userDataPath, "venv")
    await this.ensureVirtualEnvironment(systemPython, venvPath)

    // Step 3: Install dependencies
    this.reportProgress("Installing Python dependencies...", 60)
    await this.installDependencies(apiPath, venvPath)

    // Store paths for later use
    this.venvPath = venvPath
    this.pythonPath = this.getVenvPythonPath(userDataPath)

    // Verify the Python path exists
    if (!fs.existsSync(this.pythonPath)) {
      throw new Error(
        `Python executable not found at expected path: ${this.pythonPath}`
      )
    }

    return this.pythonPath
  }

  /**
   * Get the virtual environment Python path
   */
  getVenvPythonPath(userDataPath: string): string {
    const venvPath = path.join(userDataPath, "venv")
    if (this.platform === "win32") {
      return path.join(venvPath, "Scripts", "python.exe")
    } else {
      return path.join(venvPath, "bin", "python")
    }
  }

  /**
   * Check if virtual environment exists
   */
  venvExists(userDataPath: string): boolean {
    const venvPath = path.join(userDataPath, "venv")
    const venvPython = this.getVenvPythonPath(userDataPath)
    return fs.existsSync(venvPath) && fs.existsSync(venvPython)
  }

  /**
   * Find or install Python
   */
  private async findOrInstallPython(): Promise<string> {
    const pythonPath = await this.findPythonPath()
    if (pythonPath) {
      this.reportProgress("Python found", 30)
      return pythonPath
    }

    this.reportProgress("Python not found, attempting to install...", 30)
    return await this.installPython()
  }

  /**
   * Find Python executable path (cross-platform)
   */
  private async findPythonPath(): Promise<string | null> {
    const possiblePaths = this.getPythonSearchPaths()

    for (const pythonPath of possiblePaths) {
      if (await this.testPythonPath(pythonPath)) {
        return pythonPath
      }
    }

    return null
  }

  /**
   * Get platform-specific Python search paths
   */
  private getPythonSearchPaths(): string[] {
    const paths: string[] = []

    if (this.platform === "win32") {
      paths.push(
        "py",
        "python",
        "python3",
        "C:\\Python39\\python.exe",
        "C:\\Python310\\python.exe",
        "C:\\Python311\\python.exe",
        "C:\\Python312\\python.exe",
        "C:\\Python313\\python.exe",
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
        "python3",
        "python",
        "/opt/homebrew/bin/python3",
        "/usr/local/bin/python3",
        "/usr/bin/python3"
      )
    } else {
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
  private async testPythonPath(pythonPath: string): Promise<boolean> {
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
  private async installPython(): Promise<string> {
    this.reportProgress("Installing Python...", 32)

    if (this.platform === "win32") {
      return await this.installPythonWindows()
    } else if (this.platform === "darwin") {
      return await this.installPythonMacOS()
    } else {
      return await this.installPythonLinux()
    }
  }

  /**
   * Install Python on Windows
   */
  private async installPythonWindows(): Promise<string> {
    if (
      await this.runCommand(
        "winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements"
      )
    ) {
      await this.waitForCommand("python --version", 10000)
      const python = await this.findPythonPath()
      if (python) return python
    }

    if (await this.runCommand("choco install python3 -y")) {
      await this.waitForCommand("python --version", 10000)
      const python = await this.findPythonPath()
      if (python) return python
    }

    throw new Error(
      "Python installation failed. Please install Python 3.9+ manually from https://www.python.org/downloads/"
    )
  }

  /**
   * Install Python on macOS
   */
  private async installPythonMacOS(): Promise<string> {
    if (await this.runCommand("brew install python3")) {
      await this.waitForCommand("python3 --version", 10000)
      const python = await this.findPythonPath()
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
  private async installPythonLinux(): Promise<string> {
    const commands = [
      "apt-get update && apt-get install -y python3 python3-pip python3-venv",
      "yum install -y python3 python3-pip",
      "dnf install -y python3 python3-pip",
      "pacman -S --noconfirm python python-pip",
    ]

    for (const cmd of commands) {
      if (await this.runCommand(cmd, true)) {
        await this.waitForCommand("python3 --version", 10000)
        const python = await this.findPythonPath()
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
  private async runCommand(
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
  private async waitForCommand(
    command: string,
    timeout: number
  ): Promise<boolean> {
    const start = Date.now()
    const pythonCommand = command.split(" ")[0]
    while (Date.now() - start < timeout) {
      if (await this.testPythonPath(pythonCommand)) {
        return true
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    return false
  }

  /**
   * Ensure virtual environment exists and is set up
   */
  private async ensureVirtualEnvironment(
    pythonPath: string,
    venvPath: string
  ): Promise<void> {
    const venvPython = this.getVenvPythonPath(path.dirname(venvPath))

    if (fs.existsSync(venvPath) && fs.existsSync(venvPython)) {
      this.reportProgress("Virtual environment found", 45)
      return
    }

    this.reportProgress("Creating virtual environment...", 42)
    await this.createVirtualEnvironment(pythonPath, venvPath)
  }

  /**
   * Create a virtual environment
   */
  private async createVirtualEnvironment(
    pythonPath: string,
    venvPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ["-m", "venv", venvPath]
      const proc = spawn(pythonPath, args, {
        stdio: "pipe",
        shell: this.platform === "win32",
        env: this.getPythonEnv(),
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
   * Install dependencies in virtual environment
   */
  private async installDependencies(
    apiPath: string,
    venvPath: string
  ): Promise<void> {
    const venvPython = this.getVenvPythonPath(path.dirname(venvPath))
    const requirementsPath = path.join(apiPath, "requirements.txt")

    if (!fs.existsSync(requirementsPath)) {
      throw new Error(`Requirements file not found: ${requirementsPath}`)
    }

    return new Promise((resolve, reject) => {
      const pipUpgrade = spawn(
        venvPython,
        ["-m", "pip", "install", "--upgrade", "pip"],
        {
          cwd: apiPath,
          stdio: "pipe",
          shell: this.platform === "win32",
          env: this.getPythonEnv(),
        }
      )

      pipUpgrade.on("exit", (code) => {
        if (code !== 0) {
          console.warn("[PythonEnv] pip upgrade failed, continuing anyway...")
        }

        const installProc = spawn(
          venvPython,
          ["-m", "pip", "install", "-r", requirementsPath],
          {
            cwd: apiPath,
            stdio: "pipe",
            shell: this.platform === "win32",
            env: this.getPythonEnv(),
          }
        )

        let output = ""
        installProc.stdout?.on("data", (data) => {
          output += data.toString()
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
        console.warn("[PythonEnv] pip upgrade error:", error)
      })
    })
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
}
