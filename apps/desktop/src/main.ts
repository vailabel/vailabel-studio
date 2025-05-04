import { app, BrowserWindow, dialog, MessageBoxReturnValue } from "electron"
import { autoUpdater } from "electron-updater"

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
