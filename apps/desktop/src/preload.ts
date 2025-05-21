import { contextBridge, dialog, ipcMain, ipcRenderer } from "electron"

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
  restartApp: () => {
    ipcRenderer.send("restart-app")
  },
})

contextBridge.exposeInMainWorld("ipc", {
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => listener(...args)),
  off: (channel: string, listener: (...args: any[]) => void) =>
    ipcRenderer.removeListener(channel, listener),
})
