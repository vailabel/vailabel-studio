import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from "electron"
import { autoUpdater } from "electron-updater"
import * as path from "path"
import "./ipc/slqiteIpc"
import "./ipc/filesystemIpc"
import "./ipc/updateIpc"
import "./ipc/aiIpc"

import pkgJson from "../package.json"

let mainWindow: BrowserWindow
let loadingWindow: BrowserWindow | null = null
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

  const displayName = pkgJson.productName ?? pkgJson.name ?? "VAI Label Desktop"

  const menuTemplate: MenuItemConstructorOptions[] = []

  // macOS app menu
  if (process.platform === "darwin") {
    menuTemplate.push({
      label: displayName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    })
  }

  // File menu
  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Open",
      accelerator: "CmdOrCtrl+O",
      click: () => {
        mainWindow.webContents.send("open-file-dialog")
      },
    },
    {
      label: "Save",
      accelerator: "CmdOrCtrl+S",
      click: () => {
        mainWindow.webContents.send("save-file-dialog")
      },
    },
    {
      label: "Save As",
      accelerator: "CmdOrCtrl+Shift+S",
      click: () => {
        mainWindow.webContents.send("save-file-as-dialog")
      },
    },
    { type: "separator" },
    {
      label: "New Project",
      accelerator: "CmdOrCtrl+N",
      click: () => {
        mainWindow.webContents.send("new-project")
      },
    },
    {
      label: "Open Project",
      accelerator: "CmdOrCtrl+Shift+O",
      click: () => {
        mainWindow.webContents.send("open-project-dialog")
      },
    },
    { type: "separator" },
    {
      label: "Export",
      accelerator: "CmdOrCtrl+E",
      click: () => {
        mainWindow.webContents.send("export-file-dialog")
      },
    },
    {
      label: "Preferences",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        mainWindow.webContents.send("open-preferences")
      },
    },
  ]
  if (process.platform !== "darwin") {
    fileSubmenu.push({ type: "separator" })
    fileSubmenu.push({
      label: "Exit",
      accelerator: "CmdOrCtrl+Q",
      click: () => {
        app.quit()
      },
    })
  }
  menuTemplate.push({ label: "File", submenu: fileSubmenu })

  menuTemplate.push({
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  })
  menuTemplate.push({
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  })
  menuTemplate.push({
    label: "Help",
    submenu: [
      {
        label: "Learn More",
        click: () => {
          shell.openExternal("https://vailabel.com")
        },
      },
      {
        label: "Info",
        click: () => {
          const { dialog } = require("electron")
          const path = require("path")
          const pkg = require("../package.json")
          const displayName = pkg.productName ?? pkg.name ?? "VAI Label Desktop"
          // Try to use icon from package.json, fallback to a default app icon
          const iconPath = pkg.icon
            ? path.join(__dirname, "../", pkg.icon)
            : undefined
          dialog.showMessageBox({
            type: "info",
            title: `About ${displayName}`,
            message: `${displayName}\nVersion ${pkg.version}\nhttps://vailabel.com`,
            icon: iconPath,
            buttons: ["OK"],
          })
        },
      },
    ],
  })

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "index.html"))
  }
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

function fakeAutoUpdate() {
  // Simulate update available after 2 seconds
  setTimeout(() => {
    mainWindow.webContents.send("update-available", {
      version: "2.0.0",
      notes: "Fake update available!",
    })

    // Show loading window for download
    createLoadingWindow("Downloading update...")

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
          closeLoadingWindow()
        }, 500)
      }
    }, 500)
  }, 2000)
}

// Python environment setup for YOLO
function setupPythonEnv() {
  const { spawnSync } = require("child_process")
  // Find python3 path
  const pythonPathResult = spawnSync("which", ["python3"])
  let pythonPath = "python3"
  if (pythonPathResult.status === 0) {
    pythonPath = pythonPathResult.stdout.toString().trim()
  }
  console.log("Using python path:", pythonPath)
  // Optionally, you can export or return this path for later use
  return pythonPath
}

app.whenReady().then(() => {
  const pythonPath = setupPythonEnv()
  // You can use pythonPath elsewhere if needed
  createWindow()

  if (isDev) {
    // fakeAutoUpdate() // Use fake auto update in development
  } else {
    autoUpdater.checkForUpdates()

    autoUpdater.on("update-available", (info) => {
      mainWindow.webContents.send("update-available", info)
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
    })
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
