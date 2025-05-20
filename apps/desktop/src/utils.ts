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
    return path.join(__dirname, "..", relativePath)
  } else {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "dist",
      relativePath
    )
  }
}
