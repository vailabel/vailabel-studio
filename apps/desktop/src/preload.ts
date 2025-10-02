import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on("update-available", (_event, info) => callback(info))
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on("download-progress", (_event, progress) =>
      callback(progress)
    )
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on("update-downloaded", () => callback())
  },
  onInstallUpdate: (callback: () => void) => {
    ipcRenderer.on("install-update", () => callback())
  },
  restartApp: () => {
    ipcRenderer.send("restart-app")
  },
})

// Expose FastAPI service for direct frontend access
contextBridge.exposeInMainWorld("fastAPI", {
  getBaseURL: () => "http://localhost:8000",
  isServerRunning: () => {
    // Check if server is running by making a simple request
    return fetch("http://localhost:8000/docs")
      .then(() => true)
      .catch(() => false)
  },
  getStatus: () => ipcRenderer.invoke("get-fastapi-status"),
})
