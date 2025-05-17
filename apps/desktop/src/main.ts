import { app, BrowserWindow } from "electron"
import { autoUpdater } from "electron-updater"
import * as path from 'path'
let mainWindow: BrowserWindow
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "index.html"))
  }
}

app.whenReady().then(() => {
  createWindow()
  autoUpdater.checkForUpdates()

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update-available", info)
  })

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("download-progress", progress)
  })

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update-downloaded")
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
