/**
 * App-level IPC Handlers
 * Handles app-level IPC communication (updates, settings, etc.)
 */

import { ipcMain } from "electron"
import { app } from "electron"

export function registerAppHandlers(): void {
  /**
   * Restart the application
   */
  ipcMain.on("restart-app", () => {
    app.quit()
    // autoUpdater.quitAndInstall() will be called on before-quit if update is available
  })

  /**
   * Get app version
   */
  ipcMain.handle("get-app-version", async () => {
    return app.getVersion()
  })

  /**
   * Get app name
   */
  ipcMain.handle("get-app-name", async () => {
    return app.getName()
  })
}
