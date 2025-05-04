import { app, BrowserWindow, dialog, MessageBoxReturnValue } from "electron"
import { autoUpdater } from "electron-updater"
import { registerIpcHandlers } from "./ipc"
import {
  checkPythonInstalled,
  createVenvIfNotExists,
  installDependencies,
  getPythonExec,
} from "./python/envManager"

let mainWindow: BrowserWindow | null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  })

  let startUrl: string
  if (process.env.NODE_ENV === "development") {
    startUrl = "http://localhost:5173/"
  } else {
    startUrl = `file://${__dirname}/../renderer/out/index.html` // Adjusted for Next.js static export
  }

  mainWindow.loadURL(startUrl) // Dynamically load based on environment

  mainWindow.on("closed", function () {
    mainWindow = null
  })
}

// Check for updates after app is ready
app.on("ready", () => {
  if (!checkPythonInstalled()) {
    console.error("Python 3.10+ not found.")
    app.quit()
    return
  }

  if (!createVenvIfNotExists()) {
    console.error("Failed to create virtual environment.")
    app.quit()
    return
  }

  if (!installDependencies()) {
    console.error("Failed to install Python dependencies.")
    app.quit()
    return
  }
  registerIpcHandlers()
  createWindow()
  autoUpdater.checkForUpdatesAndNotify()
})

autoUpdater.on("update-available", () => {
  dialog.showMessageBox({
    type: "info",
    title: "Update available",
    message: "A new version is being downloaded.",
  })
})

autoUpdater.on("update-downloaded", () => {
  dialog
    .showMessageBox({
      type: "info",
      title: "Update Ready",
      message: "Install and restart now?",
      buttons: ["Yes", "Later"],
    })
    .then((result: MessageBoxReturnValue) => {
      if (result.response === 0) autoUpdater.quitAndInstall()
    })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
