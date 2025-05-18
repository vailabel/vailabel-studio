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
  restartApp: () => {
    ipcRenderer.send("restart-app")
  },
})

contextBridge.exposeInMainWorld("ipc", {
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
})
