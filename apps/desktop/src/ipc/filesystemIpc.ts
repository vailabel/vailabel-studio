import { ipcMain, app } from "electron"
import * as fs from "fs/promises"
import * as path from "path"
// Use Electron's userData directory for file operations
function getUserDataPath(...segments: string[]) {
  return path.join(app.getPath("userData"), ...segments)
}

// Save image
ipcMain.handle("fs-save-image", async (_event, { path: filePath, data }) => {
  let absPath = filePath
  if (
    !path.isAbsolute(filePath) &&
    filePath !== undefined &&
    filePath !== null
  ) {
    absPath = getUserDataPath(filePath)
  }
  let buffer: Buffer
  if (typeof data === "string") {
    // Try to handle data URL or base64 string
    if (data.startsWith("data:")) {
      // Data URL: extract base64 part
      const base64Data = data.split(",")[1]
      buffer = Buffer.from(base64Data, "base64")
    } else {
      // Assume plain base64 string
      buffer = Buffer.from(data, "base64")
    }
  } else if (Buffer.isBuffer(data)) {
    buffer = data
  } else if (data instanceof ArrayBuffer) {
    buffer = Buffer.from(new Uint8Array(data))
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data)
  } else if (Array.isArray(data)) {
    buffer = Buffer.from(data)
  } else {
    throw new Error("Unsupported data type for image saving")
  }
  await saveBlobToFile(absPath, buffer)
})

// Load image
ipcMain.handle("fs-load-image", async (_event, { path: filePath }) => {
  let absPath = filePath
  if (
    !path.isAbsolute(filePath) &&
    filePath !== undefined &&
    filePath !== null
  ) {
    absPath = getUserDataPath(filePath)
  }
  return fs.readFile(absPath)
})

// Delete image
ipcMain.handle("fs-delete-image", async (_event, { path: filePath }) => {
  let absPath = filePath
  if (
    !path.isAbsolute(filePath) &&
    filePath !== undefined &&
    filePath !== null
  ) {
    absPath = getUserDataPath(filePath)
  }
  await fs.unlink(absPath)
})

// List images
ipcMain.handle("fs-list-images", async (_event, { directory }) => {
  let absDir = directory
  if (
    !path.isAbsolute(directory) &&
    directory !== undefined &&
    directory !== null
  ) {
    absDir = getUserDataPath(directory)
  }
  return fs.readdir(absDir)
})

// Get full path for an image id
ipcMain.handle("fs-get-path", async (_event, { directory, id }) => {
  let absDir = directory
  if (
    !path.isAbsolute(directory) &&
    directory !== undefined &&
    directory !== null
  ) {
    absDir = getUserDataPath(directory)
  }
  return path.join(absDir, id)
})

// Get base name of a file
ipcMain.handle("fs-get-base-name", async (_event, { file }) => {
  return path.basename(file)
})

// Create directory if it doesn't exist
ipcMain.handle("fs-ensure-directory", async (_event, { path: dirPath }) => {
  let absDir = dirPath
  if (!path.isAbsolute(dirPath) && dirPath !== undefined && dirPath !== null) {
    absDir = getUserDataPath(dirPath)
  }
  await fs.mkdir(absDir, { recursive: true })
})

// Save blob file
ipcMain.handle("fs-save-blob", async (_event, { path: filePath, blob }) => {
  let absPath = filePath
  if (
    !path.isAbsolute(filePath) &&
    filePath !== undefined &&
    filePath !== null
  ) {
    absPath = getUserDataPath(filePath)
  }
  let buffer: Buffer
  if (Buffer.isBuffer(blob)) {
    buffer = blob
  } else if (blob instanceof ArrayBuffer) {
    buffer = Buffer.from(new Uint8Array(blob))
  } else if (blob instanceof Uint8Array) {
    buffer = Buffer.from(blob)
  } else if (Array.isArray(blob)) {
    buffer = Buffer.from(blob)
  } else {
    throw new Error("Unsupported blob type")
  }
  await saveBlobToFile(absPath, buffer)
})

async function saveBlobToFile(filePath: string, blob: Buffer) {
  await fs.writeFile(filePath, blob)
}
