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
