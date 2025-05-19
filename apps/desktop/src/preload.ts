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
})

ipcMain.handle("dialog:openModelFile", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Model Files", extensions: ["pt", "pth", "onnx"] },
      { name: "All Files", extensions: ["*"] },
    ],
  })
  if (result.canceled) {
    return null
  } else {
    return result.filePaths[0]
  }
})
