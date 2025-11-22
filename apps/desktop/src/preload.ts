/**
 * Preload Script
 * Exposes safe APIs to the renderer process
 * Provides type-safe communication bridge between Electron and renderer
 */

import { contextBridge, ipcRenderer } from "electron"

// Electron API interface
export interface ElectronAPI {
  // Update handlers
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
  onUpdateDownloaded: (callback: () => void) => void
  onInstallUpdate: (callback: () => void) => void
  restartApp: () => void

  // App info
  getAppVersion: () => Promise<string>
  getAppName: () => Promise<string>
}

// FastAPI interface
export interface FastAPI {
  getBaseURL: () => string
  isServerRunning: () => Promise<boolean>
  getStatus: () => Promise<FastAPIStatus>
  healthCheck: () => Promise<boolean>
}

// Type definitions
export interface UpdateInfo {
  version: string
  notes: string
}

export interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export interface FastAPIStatus {
  running: boolean
  port: number
  host: string
  baseURL: string
}

// Expose Electron API
contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on("update-available", (_event, info) => callback(info))
  },
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
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
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppName: () => ipcRenderer.invoke("get-app-name"),
} as ElectronAPI)

// Expose FastAPI service
contextBridge.exposeInMainWorld("fastAPI", {
  getBaseURL: () => "http://localhost:8000",
  isServerRunning: async (): Promise<boolean> => {
    try {
      return await ipcRenderer.invoke("is-fastapi-running")
    } catch {
      // Fallback: try direct fetch
      try {
        const response = await fetch("http://localhost:8000/docs")
        return response.ok
      } catch {
        return false
      }
    }
  },
  getStatus: (): Promise<FastAPIStatus> => {
    return ipcRenderer.invoke("get-fastapi-status")
  },
  healthCheck: (): Promise<boolean> => {
    return ipcRenderer.invoke("fastapi-health-check")
  },
} as FastAPI)

// Type augmentation for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
    fastAPI: FastAPI
  }
}
