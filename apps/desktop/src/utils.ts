/**
 * Utility functions for the desktop app
 */

import { app } from "electron"
import * as path from "path"
import * as fs from "fs"

export interface JsonSetting {
  getValue(key: string, defaultValue?: any): any
  setValue(key: string, value: any): void
  deleteValue(key: string): void
  hasValue(key: string): boolean
  getAllValues(): Record<string, any>
  clear(): void
}

class JsonSettingImpl implements JsonSetting {
  private filePath: string
  private data: Record<string, any> = {}

  constructor() {
    const userDataPath = app.getPath("userData")
    this.filePath = path.join(userDataPath, "settings.json")
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf-8")
        this.data = JSON.parse(content)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
      this.data = {}
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  getValue(key: string, defaultValue?: any): any {
    return this.data[key] !== undefined ? this.data[key] : defaultValue
  }

  setValue(key: string, value: any): void {
    this.data[key] = value
    this.save()
  }

  deleteValue(key: string): void {
    delete this.data[key]
    this.save()
  }

  hasValue(key: string): boolean {
    return key in this.data
  }

  getAllValues(): Record<string, any> {
    return { ...this.data }
  }

  clear(): void {
    this.data = {}
    this.save()
  }
}

export function jsonSetting(): JsonSetting {
  return new JsonSettingImpl()
}
