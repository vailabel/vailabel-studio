import { app, BrowserWindow } from "electron"
import { autoUpdater } from "electron-updater"
import * as path from "path"
import "./ipc/filesystemIpc"
import "./ipc/updateIpc"
import "./ipc/index"
import { jsonSetting } from "./utils"
import { initDatabase } from "./db/init"

import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from "electron-devtools-installer"
import { setAppMenu } from "./menu/appMenu"
import { isVersionSkipped, setupAutoUpdate } from "./autoUpdate/autoUpdate"

let mainWindow: BrowserWindow
let loadingWindow: BrowserWindow | null = null
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
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
    width: 400,
    height: 200,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  const html = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><title>Loading...</title><style>html,body{height:100%;margin:0;padding:0;background:#fff;font-family:sans-serif;}body{display:flex;align-items:center;justify-content:center;height:100%;}.container{text-align:center;}.icon{font-size:2em;margin-bottom:1em;}</style></head><body><div class='container'><div class='icon'>⏳</div><div id='loading-message'>${message}</div></div></body></html>`
  loadingWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(html)
  )
  loadingWindow.setMenu(null)
}

function closeLoadingWindow() {
  if (loadingWindow) {
    loadingWindow.close()
    loadingWindow = null
  }
}

app.whenReady().then(async () => {
  try {
    await initDatabase()
  } catch (err) {
    return
  }

  createLoadingWindow("Loading Vision AI Label...")

  setTimeout(() => {
    if (loadingWindow) {
      loadingWindow.close()
      loadingWindow = null
    }
    createWindow()
    setupAutoUpdate(mainWindow, loadingWindow, isDev)
  }, 2000) // Show splash for 2 seconds

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
})
