/**
 * Window Manager
 * Manages BrowserWindow instances and their lifecycle
 */

import { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import * as path from "path"

export interface WindowConfig {
  width?: number
  height?: number
  show?: boolean
  frame?: boolean
  resizable?: boolean
  movable?: boolean
  alwaysOnTop?: boolean
  center?: boolean
  webPreferences?: BrowserWindowConstructorOptions["webPreferences"]
}

export interface LoadingWindowConfig extends WindowConfig {
  message?: string
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private loadingWindow: BrowserWindow | null = null
  private isDev: boolean

  constructor(isDev: boolean = false) {
    this.isDev = isDev
  }

  /**
   * Create the main application window
   */
  createMainWindow(config?: WindowConfig): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }

    const defaultConfig: BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      maximizable: true,
      webPreferences: {
        preload: path.join(__dirname, "../../preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      ...config,
    }

    this.mainWindow = new BrowserWindow(defaultConfig)

    if (this.isDev) {
      this.mainWindow.loadURL("http://localhost:5173")
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(path.join(__dirname, "../index.html"))
    }

    return this.mainWindow
  }

  /**
   * Create the loading window
   */
  createLoadingWindow(config?: LoadingWindowConfig): BrowserWindow {
    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      return this.loadingWindow
    }

    const defaultConfig: BrowserWindowConstructorOptions = {
      width: 500,
      height: 400,
      frame: false,
      resizable: false,
      movable: true,
      alwaysOnTop: true,
      center: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      ...config,
    }

    this.loadingWindow = new BrowserWindow(defaultConfig)

    const loadingHtmlPath = path.join(__dirname, "../../loading.html")
    this.loadingWindow.loadFile(loadingHtmlPath)
    this.loadingWindow.setMenu(null)

    // Show window when ready
    this.loadingWindow.once("ready-to-show", () => {
      if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
        this.loadingWindow.show()
        if (config?.message) {
          setTimeout(() => {
            if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
              this.loadingWindow.webContents.send(
                "loading-message",
                config.message
              )
            }
          }, 100)
        }
      }
    })

    return this.loadingWindow
  }

  /**
   * Get the main window
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  /**
   * Get the loading window
   */
  getLoadingWindow(): BrowserWindow | null {
    return this.loadingWindow
  }

  /**
   * Close the loading window
   */
  closeLoadingWindow(): void {
    if (this.loadingWindow) {
      this.loadingWindow.close()
      this.loadingWindow = null
    }
  }

  /**
   * Update loading progress
   */
  updateLoadingProgress(percent: number, message?: string): void {
    if (this.loadingWindow && !this.loadingWindow.isDestroyed()) {
      this.loadingWindow.webContents.send("loading-progress", percent)
      if (message) {
        this.loadingWindow.webContents.send("loading-message", message)
      }
    } else {
      console.log("Loading window not available for progress update")
    }
  }

  /**
   * Close all windows
   */
  closeAllWindows(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close()
      this.mainWindow = null
    }
    this.closeLoadingWindow()
  }
}
