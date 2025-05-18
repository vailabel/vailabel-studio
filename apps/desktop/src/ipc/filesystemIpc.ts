import { ipcMain } from "electron"
import * as fs from "fs/promises"
import * as path from "path"
// Save image
ipcMain.handle("fs-save-image", async (_event, { path: filePath, data }) => {
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
  await saveBlobToFile(filePath, buffer)
})

// Load image
ipcMain.handle("fs-load-image", async (_event, { path: filePath }) => {
  return fs.readFile(filePath)
})

// Delete image
ipcMain.handle("fs-delete-image", async (_event, { path: filePath }) => {
  await fs.unlink(filePath)
})

// List images
ipcMain.handle("fs-list-images", async (_event, { directory }) => {
  return fs.readdir(directory)
})

// Get full path for an image id
ipcMain.handle("fs-get-path", async (_event, { directory, id }) => {
  return path.join(directory, id)
})

// Get base name of a file
ipcMain.handle("fs-get-base-name", async (_event, { file }) => {
  return path.basename(file)
})

// Create directory if it doesn't exist
ipcMain.handle("fs-ensure-directory", async (_event, { path: dirPath }) => {
  await fs.mkdir(dirPath, { recursive: true })
})

// Save blob file
ipcMain.handle("fs-save-blob", async (_event, { path: filePath, blob }) => {
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
  await saveBlobToFile(filePath, buffer)
})

async function saveBlobToFile(filePath: string, blob: Buffer) {
  await fs.writeFile(filePath, blob)
}
