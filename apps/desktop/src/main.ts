import { app, BrowserWindow } from "electron"
import { autoUpdater } from "electron-updater"
import * as path from "path"
import { fastApiService } from "./services/fastapi-service"

import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from "electron-devtools-installer"
import { setAppMenu } from "./menu/appMenu"
import { isVersionSkipped, setupAutoUpdate } from "./autoUpdate/autoUpdate"

let mainWindow: BrowserWindow
let loadingWindow: BrowserWindow | null = null

function createWindow() {
  const isDev = !app.isPackaged
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  setAppMenu(mainWindow)

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "index.html"))
  }
  installExtension(REDUX_DEVTOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log("An error occurred: ", err))

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log("An error occurred: ", err))
}

function createLoadingWindow(message: string) {
  loadingWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    center: true,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    // In development, load from file system
    loadingWindow.loadFile(path.join(__dirname, "loading.html"))
  } else {
    // In production, load from dist folder
    loadingWindow.loadFile(path.join(__dirname, "loading.html"))
  }

  loadingWindow.setMenu(null)

  // Show window when ready
  loadingWindow.once("ready-to-show", () => {
    console.log("Loading window ready to show")
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.show()
      console.log("Loading window shown")
      // Send initial message
      setTimeout(() => {
        if (loadingWindow && !loadingWindow.isDestroyed()) {
          loadingWindow.webContents.send("loading-message", message)
          console.log("Initial loading message sent:", message)
        }
      }, 100)
    }
  })
}

function closeLoadingWindow() {
  if (loadingWindow) {
    loadingWindow.close()
    loadingWindow = null
  }
}

function updateLoadingProgress(percent: number, message?: string) {
  console.log(`Updating loading progress: ${percent}%`, message || "")
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("loading-progress", percent)
    if (message) {
      loadingWindow.webContents.send("loading-message", message)
    }
  } else {
    console.log("Loading window not available for progress update")
  }
}

app.whenReady().then(async () => {
  console.log("App is ready, initializing...")

  console.log("Creating loading window...")
  createLoadingWindow("Initializing Vailabel Studio...")
  updateLoadingProgress(10, "Starting application...")

  // Import system modules after app is ready
  updateLoadingProgress(20, "Loading system modules...")
  // IPC modules removed - using direct FastAPI communication

  updateLoadingProgress(40, "Starting FastAPI backend...")
  try {
    // Configure FastAPI service with Electron context
    fastApiService.config.isPackaged = app.isPackaged
    fastApiService.config.userDataPath = app.getPath("userData")
    await fastApiService.start()
    console.log("FastAPI backend started successfully")
    updateLoadingProgress(60, "Backend ready")
  } catch (err) {
    console.error("FastAPI backend startup failed:", err)
    updateLoadingProgress(100, "Backend startup failed")
    setTimeout(() => {
      closeLoadingWindow()
    }, 2000)
    return
  }

  updateLoadingProgress(80, "Preparing interface...")

  // Small delay to show the loading screen
  setTimeout(() => {
    updateLoadingProgress(100, "Ready!")

    setTimeout(() => {
      closeLoadingWindow()
      console.log("Creating main window...")
      createWindow()
      const isDev = !app.isPackaged
      setupAutoUpdate(mainWindow, loadingWindow, isDev)
    }, 500)
  }, 1000)

  const isDev = !app.isPackaged
  if (isDev) {
    // Simulate update available after 2 seconds
    setTimeout(() => {
      mainWindow.webContents.send("update-available", {
        version: "2.0.0",
        notes: "Fake update available!",
      })

      // Simulate download progress with detailed data
      let percent = 0
      const total = 50000000 // 50 MB for example
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
          // Simulate update downloaded
          setTimeout(() => {
            mainWindow.webContents.send("update-downloaded")
          }, 500)
        }
      }, 500)
    }, 2000)
  } else {
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
              // Skip version logic removed - using direct FastAPI communication
              console.log(`Skipping version ${info.version}`)
            }
          })
      }
    })
    autoUpdater.on("download-progress", (progress) => {
      if (!loadingWindow) {
        createLoadingWindow("Downloading update...")
      }
      updateLoadingProgress(
        progress.percent,
        `Downloading update... ${Math.round(progress.percent)}%`
      )
      mainWindow.webContents.send("download-progress", progress)
    })
    autoUpdater.on("update-downloaded", () => {
      mainWindow.webContents.send("update-downloaded")
      closeLoadingWindow()
      // Install update on restart
      app.once("before-quit", () => {
        autoUpdater.quitAndInstall()
      })
    })
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Listen for restart-app from renderer to trigger update install
  const { ipcMain } = require("electron")
  ipcMain.on("restart-app", () => {
    app.quit()
    // autoUpdater.quitAndInstall() will be called on before-quit
  })

  // Expose FastAPI service to renderer process
  ipcMain.handle("get-fastapi-status", async () => {
    return {
      isRunning: fastApiService.isServerRunning(),
      baseURL: "http://localhost:8000",
    }
  })

  // Cleanup on app quit
  app.on("before-quit", async () => {
    console.log("Shutting down FastAPI backend...")
    try {
      await fastApiService.stop()
    } catch (error) {
      console.error("Error stopping FastAPI backend:", error)
    }
  })
})
