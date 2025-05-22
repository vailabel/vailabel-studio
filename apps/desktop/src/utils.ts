import path from "path"
import { app } from "electron"

export function resolveResource(relativePath: string): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, "..", relativePath)
  } else {
    return path.join(process.resourcesPath, relativePath)
  }
}

/**
 * Resolves a file path, supporting `asarUnpack` files for execution.
 * @param relativePath - Relative path from the root (e.g., "dist/ai/requirements.txt")
 */
export function resolveUnpacked(relativePath: string): string {
  const isDev = !app.isPackaged

  if (isDev) {
    return path.join(__dirname, "..", "dist", relativePath)
  } else {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "dist",
      relativePath
    )
  }
}

export function jsonSetting() {
  const fs = require("fs")
  const path = require("path")
  const { app } = require("electron")
  const appDataPath = app.getPath("userData")
  const filePath = path.join(appDataPath, "settings.json")

  function readData(): Record<string, any> {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}))
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"))
    } catch {
      return {}
    }
  }

  function getValue(key: string, defaultValue: any): any {
    const data = readData()
    return data[key] !== undefined ? data[key] : defaultValue
  }

  function setValue(key: string, value: any): void {
    const data = readData()
    data[key] = value
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  }

  return {
    getValue,
    setValue,
  }
}
