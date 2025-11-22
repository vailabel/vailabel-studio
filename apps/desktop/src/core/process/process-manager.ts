/**
 * Process Manager
 * Handles child process lifecycle management
 * Cross-platform process spawning, monitoring, and termination
 */

import { spawn, ChildProcess } from "child_process"

export interface IProcessManager {
  spawn(
    command: string,
    args: string[],
    options: ProcessSpawnOptions
  ): ChildProcess

  kill(process: ChildProcess, signal?: NodeJS.Signals): Promise<void>

  waitForExit(
    process: ChildProcess,
    timeout?: number
  ): Promise<{ code: number | null; signal: NodeJS.Signals | null }>

  monitor(process: ChildProcess, options: ProcessMonitorOptions): () => void
}

export interface ProcessSpawnOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  stdio?: Array<"pipe" | "ignore" | "inherit">
  shell?: boolean
}

export interface ProcessMonitorOptions {
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void
  onError?: (error: Error) => void
}

export class ProcessManager implements IProcessManager {
  private platform: NodeJS.Platform

  constructor() {
    this.platform = process.platform
  }

  /**
   * Spawn a child process
   */
  spawn(
    command: string,
    args: string[],
    options: ProcessSpawnOptions
  ): ChildProcess {
    return spawn(command, args, {
      ...options,
      shell: options.shell ?? this.platform === "win32",
    })
  }

  /**
   * Kill a process gracefully, then forcefully if needed
   */
  async kill(
    process: ChildProcess,
    signal: NodeJS.Signals = "SIGTERM"
  ): Promise<void> {
    if (!process || process.killed) {
      return
    }

    try {
      process.kill(signal)

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        if (!process) {
          resolve()
          return
        }

        const timeout = setTimeout(() => {
          if (process && !process.killed) {
            try {
              process.kill("SIGKILL")
            } catch {}
          }
          resolve()
        }, 5000)

        process.once("exit", () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    } catch (error) {
      console.error("[ProcessManager] Error killing process:", error)
      throw error
    }
  }

  /**
   * Wait for process to exit
   */
  async waitForExit(
    process: ChildProcess,
    timeout: number = 30000
  ): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
    return new Promise((resolve, reject) => {
      if (!process) {
        resolve({ code: null, signal: null })
        return
      }

      const timeoutId = setTimeout(() => {
        reject(new Error("Process exit timeout"))
      }, timeout)

      process.once("exit", (code, signal) => {
        clearTimeout(timeoutId)
        resolve({ code, signal })
      })

      process.once("error", (error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
    })
  }

  /**
   * Monitor process output and events
   */
  monitor(process: ChildProcess, options: ProcessMonitorOptions): () => void {
    const cleanup: (() => void)[] = []

    if (options.onStdout && process.stdout) {
      const handler = (data: Buffer) => {
        options.onStdout?.(data.toString())
      }
      process.stdout.on("data", handler)
      cleanup.push(() => process.stdout?.removeListener("data", handler))
    }

    if (options.onStderr && process.stderr) {
      const handler = (data: Buffer) => {
        options.onStderr?.(data.toString())
      }
      process.stderr.on("data", handler)
      cleanup.push(() => process.stderr?.removeListener("data", handler))
    }

    if (options.onExit) {
      const handler = (code: number | null, signal: NodeJS.Signals | null) => {
        options.onExit?.(code, signal)
      }
      process.once("exit", handler)
      cleanup.push(() => process.removeListener("exit", handler))
    }

    if (options.onError) {
      const handler = (error: Error) => {
        options.onError?.(error)
      }
      process.once("error", handler)
      cleanup.push(() => process.removeListener("error", handler))
    }

    return () => {
      cleanup.forEach((fn) => fn())
    }
  }
}
