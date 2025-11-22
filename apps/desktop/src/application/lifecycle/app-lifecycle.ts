/**
 * App Lifecycle Manager
 * Coordinates app startup sequence and manages initialization order
 * Handles graceful shutdown
 */

import { app } from "electron"
import { IAPIBridgeService } from "../../services/fastapi/api-bridge-service"
import { WindowManager } from "../windows/window-manager"
import { AppConfigManager } from "../../core/config/app-config"

export interface AppLifecycleCallbacks {
  onStartupProgress?: (message: string, percent: number) => void
  onStartupComplete?: () => void
  onStartupError?: (error: Error) => void
  onShutdown?: () => Promise<void>
}

export class AppLifecycle {
  private apiBridge: IAPIBridgeService
  private windowManager: WindowManager
  private configManager: AppConfigManager
  private callbacks: AppLifecycleCallbacks
  private isInitialized: boolean = false

  constructor(
    apiBridge: IAPIBridgeService,
    windowManager: WindowManager,
    configManager: AppConfigManager,
    callbacks?: AppLifecycleCallbacks
  ) {
    this.apiBridge = apiBridge
    this.windowManager = windowManager
    this.configManager = configManager
    this.callbacks = callbacks || {}
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("[AppLifecycle] App already initialized")
      return
    }

    try {
      this.reportProgress("Starting application...", 10)

      // Step 1: Create loading window
      this.reportProgress("Loading system modules...", 20)
      this.windowManager.createLoadingWindow({
        message: "Initializing Vailabel Studio...",
      })

      // Step 2: Start FastAPI backend
      this.reportProgress("Starting FastAPI backend...", 40)
      await this.startBackend()

      // Step 3: Prepare interface
      this.reportProgress("Preparing interface...", 80)

      // Small delay to show the loading screen
      await new Promise((resolve) => setTimeout(resolve, 1000))

      this.reportProgress("Ready!", 100)

      // Step 4: Create main window
      setTimeout(() => {
        this.windowManager.closeLoadingWindow()
        this.windowManager.createMainWindow()
        this.isInitialized = true
        this.callbacks.onStartupComplete?.()
      }, 500)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.reportProgress("Startup failed", 100)
      this.callbacks.onStartupError?.(err)
      setTimeout(() => {
        this.windowManager.closeLoadingWindow()
      }, 2000)
      throw err
    }
  }

  /**
   * Start the FastAPI backend
   */
  private async startBackend(): Promise<void> {
    const paths = this.configManager.getPaths()
    const config = this.configManager.getConfig()

    await this.apiBridge.start({
      apiPath: paths.apiPath,
      userDataPath: paths.userData,
      onProgress: (message, percent) => {
        if (percent !== undefined) {
          this.reportProgress(message, percent)
        } else {
          console.log(`[FastAPI] ${message}`)
        }
      },
    })
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown(): Promise<void> {
    console.log("[AppLifecycle] Shutting down...")

    try {
      // Call custom shutdown callback
      if (this.callbacks.onShutdown) {
        await this.callbacks.onShutdown()
      }

      // Stop FastAPI backend
      if (this.apiBridge.isServerRunning()) {
        console.log("[AppLifecycle] Stopping FastAPI backend...")
        await this.apiBridge.stop()
      }

      // Close all windows
      this.windowManager.closeAllWindows()

      this.isInitialized = false
      console.log("[AppLifecycle] Shutdown complete")
    } catch (error) {
      console.error("[AppLifecycle] Error during shutdown:", error)
      throw error
    }
  }

  /**
   * Check if app is initialized
   */
  getInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * Report startup progress
   */
  private reportProgress(message: string, percent: number): void {
    this.windowManager.updateLoadingProgress(percent, message)
    this.callbacks.onStartupProgress?.(message, percent)
    console.log(`[AppLifecycle] ${message} (${percent}%)`)
  }
}
