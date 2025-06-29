import { autoUpdater } from "electron-updater"
import { app, BrowserWindow } from "electron"
import { jsonSetting } from "../utils"

export function isVersionSkipped(version: string) {
  const settings = jsonSetting()
  return settings.getValue("skippedVersion", null) === version
}

export function setupAutoUpdate(
  mainWindow: BrowserWindow,
  loadingWindow: BrowserWindow | null,
  isDev: boolean
) {
  function createLoadingWindow(message: string) {
    if (!loadingWindow) return
    loadingWindow.webContents.send("loading-message", message)
  }

  if (isDev) {
    // Fake auto update logic can be added here if needed
    return
  }

  autoUpdater.checkForUpdates()
  autoUpdater.on("update-available", (info) => {
    if (!isVersionSkipped(info.version)) {
      const { dialog } = require("electron")
      const releaseNotes =
        typeof info.releaseNotes === "string"
          ? info.releaseNotes
          : Array.isArray(info.releaseNotes)
            ? info.releaseNotes.map((n: any) => n.note || n).join("\n")
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
            const settings = jsonSetting()
            settings.setValue("skippedVersion", info.version)
          }
        })
    }
  })
  autoUpdater.on("download-progress", (progress) => {
    if (!loadingWindow) {
      createLoadingWindow("Downloading update...")
    }
    mainWindow.webContents.send("download-progress", progress)
  })
  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update-downloaded")
    if (loadingWindow) loadingWindow.close()
    app.once("before-quit", () => {
      autoUpdater.quitAndInstall()
    })
  })
}
