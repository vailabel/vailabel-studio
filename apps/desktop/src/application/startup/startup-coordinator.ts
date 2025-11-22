/**
 * Startup Coordinator
 * Orchestrates the application startup process
 * Handles progress reporting and error handling during startup
 */

import { app } from "electron"
import { AppLifecycle } from "../lifecycle/app-lifecycle"
import { WindowManager } from "../windows/window-manager"
import { IAPIBridgeService } from "../../services/fastapi/api-bridge-service"
import { AppConfigManager } from "../../core/config/app-config"

export class StartupCoordinator {
  private appLifecycle: AppLifecycle
  private windowManager: WindowManager
  private configManager: AppConfigManager

  constructor(apiBridge: IAPIBridgeService, configManager: AppConfigManager) {
    this.configManager = configManager
    this.windowManager = new WindowManager(configManager.getEnvironment().isDev)

    this.appLifecycle = new AppLifecycle(
      apiBridge,
      this.windowManager,
      configManager,
      {
        onStartupProgress: (message, percent) => {
          console.log(`[StartupCoordinator] ${message} (${percent}%)`)
        },
        onStartupComplete: () => {
          console.log("[StartupCoordinator] Startup complete")
        },
        onStartupError: (error) => {
          console.error("[StartupCoordinator] Startup error:", error)
        },
        onShutdown: async () => {
          // Additional shutdown logic can be added here
        },
      }
    )
  }

  /**
   * Initialize the application when Electron is ready
   */
  async initialize(): Promise<void> {
    await this.appLifecycle.initialize()
  }

  /**
   * Get the window manager
   */
  getWindowManager(): WindowManager {
    return this.windowManager
  }

  /**
   * Get the app lifecycle manager
   */
  getAppLifecycle(): AppLifecycle {
    return this.appLifecycle
  }

  /**
   * Setup app event handlers
   */
  setupEventHandlers(): void {
    // Handle window activation (macOS)
    app.on("activate", () => {
      const windowManager = this.getWindowManager()
      const mainWindow = windowManager.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) {
        windowManager.createMainWindow()
      }
    })

    // Handle app shutdown
    app.on("before-quit", async () => {
      await this.appLifecycle.shutdown()
    })
  }
}
