/**
 * FastAPI IPC Handlers
 * Type-safe IPC communication for FastAPI status and control
 */

import { ipcMain } from "electron"
import { IAPIBridgeService } from "../services/fastapi/api-bridge-service"

export function registerFastAPIHandlers(apiBridge: IAPIBridgeService): void {
  /**
   * Get FastAPI server status
   */
  ipcMain.handle("get-fastapi-status", async () => {
    try {
      return apiBridge.getStatus()
    } catch (error) {
      console.error("[IPC] Error getting FastAPI status:", error)
      return {
        running: false,
        port: 8000,
        host: "localhost",
        baseURL: "http://localhost:8000",
      }
    }
  })

  /**
   * Check if FastAPI server is running
   */
  ipcMain.handle("is-fastapi-running", async () => {
    try {
      return apiBridge.isServerRunning()
    } catch (error) {
      console.error("[IPC] Error checking FastAPI status:", error)
      return false
    }
  })

  /**
   * Perform health check
   */
  ipcMain.handle("fastapi-health-check", async () => {
    try {
      return await apiBridge.healthCheck()
    } catch (error) {
      console.error("[IPC] Error performing health check:", error)
      return false
    }
  })
}
