import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateAvailable: (callback: (info: any) => void) =>
    ipcRenderer.on("update-available", (_, info) => callback(info)),
  onDownloadProgress: (callback: (progress: any) => void) =>
    ipcRenderer.on("download-progress", (_, progress) => callback(progress)),
  onUpdateDownloaded: (callback: () => void) =>
    ipcRenderer.on("update-downloaded", () => callback()),
})

console.log("Preload script loaded")
