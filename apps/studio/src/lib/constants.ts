// Helper types for safe property access
interface ElectronProcess {
  versions?: {
    electron?: string
  }
}
interface ElectronWindow extends Window {
  process?: ElectronProcess
}

export const isElectron = () => {
  // Renderer process
  if (typeof window !== "undefined") {
    const w = window as ElectronWindow
    if (w.process && w.process.versions && w.process.versions.electron) {
      return true
    }
  }
  // Main process
  if (typeof process !== "undefined") {
    const p = process as ElectronProcess
    if (p.versions && p.versions.electron) {
      return true
    }
  }
  // Detect via user agent (fallback, not 100% reliable)
  if (
    typeof navigator === "object" &&
    navigator.userAgent.includes("Electron")
  ) {
    return true
  }
  return false
}

export const APP_NAME = "Vai Studio"
export const APP_VERSION = "0.0.0" // TODO: Replace with actual version or inject at build time


export const isDevMode = () => {
  return process.env.NODE_ENV === "development"
}
