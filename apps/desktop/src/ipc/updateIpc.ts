import { ipcMain, app } from "electron"

ipcMain.on("restart-app", () => {
  app.relaunch()
  app.exit(0)
})

// ...existing code...
