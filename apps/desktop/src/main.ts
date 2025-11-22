/**
 * Main Electron Process
 * Entry point for the desktop application
 * Initializes services, coordinators, and IPC handlers
 */

import { app } from "electron"
import { autoUpdater } from "electron-updater"
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from "electron-devtools-installer"

// Core Infrastructure
import { AppConfigManager } from "./core/config/app-config"
import { PythonEnvironmentManager } from "./core/python/python-environment-manager"
import { ProcessManager } from "./core/process/process-manager"

// Services
import { APIBridgeService } from "./services/fastapi/api-bridge-service"

// Application Layer
import { StartupCoordinator } from "./application/startup/startup-coordinator"

// IPC Handlers
import { registerFastAPIHandlers } from "./ipc/fastapi-handlers"
import { registerAppHandlers } from "./ipc/app-handlers"

// Other modules
import { setAppMenu } from "./menu/appMenu"
import { isVersionSkipped, setupAutoUpdate } from "./autoUpdate/autoUpdate"

// Initialize core services
const configManager = new AppConfigManager()
const pythonEnvManager = new PythonEnvironmentManager()
const processManager = new ProcessManager()

// Initialize FastAPI bridge service
const fastAPIConfig = configManager.getFastAPIConfig()
const apiBridge = new APIBridgeService(
  {
    host: fastAPIConfig.host,
    port: fastAPIConfig.port,
    apiPath: configManager.getPaths().apiPath,
    pythonPath: fastAPIConfig.pythonPath,
  },
  pythonEnvManager,
  processManager
)

// Initialize startup coordinator
const startupCoordinator = new StartupCoordinator(apiBridge, configManager)

// Setup app event handlers
startupCoordinator.setupEventHandlers()

// Install dev tools extensions
function installDevTools() {
  const isDev = !app.isPackaged
  if (isDev) {
    installExtension(REDUX_DEVTOOLS)
      .then((name) => console.log(`Added Extension: ${name}`))
      .catch((err) => console.log("An error occurred: ", err))

    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension: ${name}`))
      .catch((err) => console.log("An error occurred: ", err))
  }
}

// Setup auto-update
function setupAutoUpdateHandlers() {
  const isDev = !app.isPackaged
  const windowManager = startupCoordinator.getWindowManager()
  const mainWindow = windowManager.getMainWindow()
  const loadingWindow = windowManager.getLoadingWindow()

  if (isDev) {
    // Simulate update available after 2 seconds (dev mode)
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update-available", {
          version: "2.0.0",
          notes: "Fake update available!",
        })

        // Simulate download progress
        let percent = 0
        const total = 50000000 // 50 MB
        let transferred = 0
        const bytesPerSecond = 5000000 // 5 MB/s

        const progressInterval = setInterval(() => {
          percent += 20
          transferred = Math.min(total, transferred + total * 0.2)
          const progress = {
            percent,
            transferred,
            total,
            bytesPerSecond,
          }
          mainWindow.webContents.send("download-progress", progress)
          if (percent >= 100) {
            clearInterval(progressInterval)
            setTimeout(() => {
              mainWindow.webContents.send("update-downloaded")
            }, 500)
          }
        }, 500)
      }
    }, 2000)
  } else {
    // Production auto-update
    autoUpdater.checkForUpdates()
    autoUpdater.on("update-available", (info) => {
      if (!isVersionSkipped(info.version)) {
        const { dialog } = require("electron")
        const releaseNotes =
          typeof info.releaseNotes === "string"
            ? info.releaseNotes
            : Array.isArray(info.releaseNotes)
            ? info.releaseNotes.map((n) => n.note || n).join("\n")
            : ""
        dialog
          .showMessageBox({
            type: "info",
            title: "Update Available",
            message: `A new version (${info.version}) is available.\n\nRelease notes:\n${releaseNotes}\n\nWould you like to update now or skip this version?`,
            buttons: ["Update", "Skip"],
            defaultId: 0,
            cancelId: 1,
          })
          .then((result: { response: number }) => {
            if (result.response === 0) {
              autoUpdater.downloadUpdate()
            } else {
              console.log(`Skipping version ${info.version}`)
            }
          })
      }
    })
    autoUpdater.on("download-progress", (progress) => {
      if (!loadingWindow) {
        windowManager.createLoadingWindow({ message: "Downloading update..." })
      }
      windowManager.updateLoadingProgress(
        progress.percent,
        `Downloading update... ${Math.round(progress.percent)}%`
      )
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("download-progress", progress)
      }
    })
    autoUpdater.on("update-downloaded", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update-downloaded")
      }
      windowManager.closeLoadingWindow()
      app.once("before-quit", () => {
        autoUpdater.quitAndInstall()
      })
    })
  }
}

// Main initialization
app.whenReady().then(async () => {
  console.log("[Main] App is ready, initializing...")

  try {
    // Register IPC handlers
    registerFastAPIHandlers(apiBridge)
    registerAppHandlers()

    // Initialize application
    await startupCoordinator.initialize()

    // Setup menu
    const windowManager = startupCoordinator.getWindowManager()
    const mainWindow = windowManager.getMainWindow()
    if (mainWindow) {
      setAppMenu(mainWindow)
    }

    // Install dev tools
    installDevTools()

    // Setup auto-update
    setupAutoUpdateHandlers()

    console.log("[Main] Application initialized successfully")
  } catch (error) {
    console.error("[Main] Failed to initialize application:", error)
    app.quit()
  }
})

// Handle app shutdown
app.on("before-quit", async () => {
  console.log("[Main] Shutting down application...")
  try {
    const appLifecycle = startupCoordinator.getAppLifecycle()
    await appLifecycle.shutdown()
  } catch (error) {
    console.error("[Main] Error during shutdown:", error)
  }
})
